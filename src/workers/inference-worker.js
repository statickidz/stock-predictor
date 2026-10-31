import {prepare, sample} from '../lib/inference-core.js';
import {graphBytes} from '../lib/model-cache.js';
import {assetUrl} from '../lib/asset-url.js';

let ort;
const batch = 3;
let sessions;
let provider;
let modelKey;
let requestId;
let running = false;
const emit = value => postMessage({...value, requestId});
const tensor = (data, dims) => new ort.Tensor('float32', Float32Array.from(data), dims);
const release = outputs => Object.values(outputs).forEach(t => t.dispose());

function checkLogits(actual, expected) {
  if (actual.length !== expected.length) throw new Error('Parity logits shape mismatch.');
  for (let i = 0; i < actual.length; i++) {
    if (!Number.isFinite(actual[i]) || Math.abs(actual[i] - expected[i]) > 0.002 + 0.002 * Math.abs(expected[i])) {
      throw new Error(`Parity logits differ at index ${i}: ${actual[i]} vs ${expected[i]}.`);
    }
  }
}

async function load(selected, model) {
  if (sessions && provider === selected && modelKey === model.key) return;
  if (sessions) {
    for (const s of Object.values(sessions)) await s.release();
    sessions = undefined;
  }
  provider = selected;
  modelKey = model.key;
  const loaded = {};
  try {
    if (selected === 'webgpu' && !navigator.gpu) throw new Error('WebGPU is unavailable. Select WebAssembly or use a supported browser over localhost/HTTPS.');
    if (!ort) {
      // Keep the large runtime and its WASM outside the frontend/worker bundles.
      // An absolute browser URL also avoids Vite's dev-only `?import` rewriting.
      const runtimeUrl = new URL(assetUrl('runtime/ort.webgpu.min.mjs'), globalThis.location.origin).href;
      ort = await import(/* @vite-ignore */ runtimeUrl);
      ort.env.wasm.wasmPaths = new URL(assetUrl('runtime/'), globalThis.location.origin).href;
      ort.env.wasm.numThreads = 1; // GitHub Pages cannot set COOP/COEP response headers.
    }
    const base = new URL(assetUrl(`models/${model.key}/`), globalThis.location.origin);
    const response = await fetch(new URL('manifest.json', base), {cache:'no-cache'});
    if (!response.ok) throw new Error('Model files are missing from this deployment. Rebuild the site.');
    const manifest = await response.json();
    if (manifest.model !== model.model_id || manifest.format !== 1) throw new Error('Model manifest does not match the selection. Reload the page.');
    for (const [name, graph] of Object.entries(manifest.graphs)) {
      const bytes = await graphBytes(base, graph, (done,total) => emit({type:'status', message:`Loading ${model.name}: ${name} ${(done/1e6).toFixed(1)} / ${(total/1e6).toFixed(1)} MB…`}));
      emit({type:'status', message:`Preparing ${model.name}: ${name} on ${selected}…`});
      loaded[name] = await ort.InferenceSession.create(bytes,
        {executionProviders: [selected], graphOptimizationLevel: 'all'});
    }
    sessions = loaded;
  } catch (error) {
    for (const s of Object.values(loaded)) await s.release();
    throw error;
  }
}

async function forecast(input, parity) {
  const p = prepare(input);
  const repeated = Array.from({length: batch}, () => p.normalized).flat();
  const x = tensor(repeated, [batch, p.length, 6]);
  let encoded;
  try { encoded = await sessions.encoder.run({x}); } finally { x.dispose(); }
  let pre, post;
  try {
    pre = Array.from({length: batch}, (_, b) => Array.from(encoded.pre.data.slice(b*p.length, (b+1)*p.length)));
    post = Array.from({length: batch}, (_, b) => Array.from(encoded.post.data.slice(b*p.length, (b+1)*p.length)));
  } finally { release(encoded); }
  for (let i = 0; i < p.horizon; i++) {
    const seq = p.length + i;
    const feeds = {pre: tensor(pre.flat(), [batch, seq]), post: tensor(post.flat(), [batch, seq]),
      stamps: tensor(Array.from({length: batch}, () => p.times.slice(0, seq).flat()).flat(), [batch, seq, 5])};
    let first;
    try { first = await sessions.stage1.run(feeds); } finally { release(feeds); }
    let second, token;
    try {
      const vocab = first.logits.dims[1];
      if (parity) checkLogits(first.logits.data, input.reference_logits[i][0]);
      const a = Array.from({length: batch}, (_, b) => parity ? input.forced_tokens[i][0][b] : sample(first.logits.data.subarray(b*vocab, (b+1)*vocab)));
      token = tensor(a, [batch, 1]);
      second = await sessions.stage2.run({context: first.context, token});
      if (parity) checkLogits(second.logits.data, input.reference_logits[i][1]);
      const vocab2 = second.logits.dims[1];
      for (let b = 0; b < batch; b++) {
        pre[b].push(a[b]);
        post[b].push(parity ? input.forced_tokens[i][1][b] : sample(second.logits.data.subarray(b*vocab2, (b+1)*vocab2)));
      }
    } finally {
      token?.dispose();
      release(first);
      if (second) release(second);
    }
    emit({type: 'status', message: `Forecasting ${i + 1} / ${p.horizon} days…`});
  }
  const seq = p.length + p.horizon;
  const feeds = {pre: tensor(pre.flat(), [batch, seq]), post: tensor(post.flat(), [batch, seq])};
  let decoded;
  try { decoded = await sessions.decoder.run(feeds); } finally { release(feeds); }
  try {
    const closes = Array.from({length: p.horizon}, (_, i) => {
      let value = 0;
      for (let b = 0; b < batch; b++) value += decoded.values.data[(b*seq + p.length + i)*6 + 3] / batch;
      return value * (p.std[3] + 1e-5) + p.mean[3];
    });
    if (!closes.every(v => Number.isFinite(v) && v > 0)) throw new Error('Model returned invalid prices.');
    return closes;
  } finally { release(decoded); }
}

onmessage = async ({data}) => {
  if (running) return;
  running = true;
  requestId = data.requestId;
  const started = performance.now();
  try {
    // Validate input before loading large graphs.
    prepare(data.input);
    if (!['mini','small','base'].includes(data.model?.key)) throw new Error('Choose a supported model.');
    await load(data.provider, data.model);
    const loaded = performance.now();
    const closes = await forecast(data.input, data.parity);
    let maxError = null;
    if (data.parity) {
      maxError = Math.max(...closes.map((v, i) => Math.abs(v - data.input.expected_closes[i])));
      if (maxError > 0.01) throw new Error(`Parity failed: maximum close error ${maxError.toFixed(6)} > 0.01 USD.`);
    }
    emit({type: 'result', closes, maxError, provider, loadMs: loaded-started, inferenceMs: performance.now()-loaded});
  } catch (error) {
    emit({type: 'error', message: error.message || String(error)});
  } finally {
    running = false;
  }
};
