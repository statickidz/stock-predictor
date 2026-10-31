import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile, rm, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const packaging = await import('../scripts/lib/packaging.mjs').catch(() => ({}));
const preparation = await import('../scripts/prepare-assets.mjs').catch(() => ({}));
const market = await import('../scripts/lib/market.mjs');
const profile = {key: 'mini', name: 'Kronos Mini', model_id: 'test/model', tokenizer_id: 'test/tokenizer', revision: 'a'.repeat(40), tokenizer_revision: 'b'.repeat(40), max_context: 2048};
const btc = {symbol: 'BTC-USD', name: 'Bitcoin', kind: 'crypto', exchange: 'Crypto', currency: 'USD'};
const eth = {...btc, symbol: 'ETH-USD', name: 'Ethereum'};
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, JSON.stringify(value));
const history = asset => {
  const candles = Array.from({length: 64}, (_, i) => ({date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), open: 100, high: 102, low: 99, close: 101, volume: 1}));
  return {asset, candles, as_of: '2025-03-05', fetched_at: '2025-03-06T10:00:00Z', source: 'Yahoo Finance via yfinance', adjusted: true, future_dates: Array.from({length: 20}, (_, i) => `2025-03-${String(i + 6).padStart(2, '0')}`)};
};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'stock-assets-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  for (const directory of ['data/calendar', '.cache/browser-models/mini', '.cache/pages-history', 'public', 'node_modules/onnxruntime-web/dist', 'tools/model-export/vendor/kronos', 'vendor']) await mkdir(join(root, directory), {recursive: true});
  await writeJson(join(root, 'data/assets.json'), [btc, eth]);
  await writeJson(join(root, 'data/models.json'), [profile]);
  const source = join(root, '.cache/browser-models/mini');
  const manifest = {model: profile.model_id, revision: profile.revision, tokenizer: profile.tokenizer_id, tokenizer_revision: profile.tokenizer_revision, context: 256, samples: 3, graphs: {encoder: 'encoder.onnx', decoder: 'decoder.onnx', stage1: 'stage1.onnx', stage2: 'stage2.onnx'}};
  await writeJson(join(source, 'manifest.json'), manifest);
  await writeJson(join(source, 'fixture.json'), {forced_tokens: [[1]], reference_logits: [[1]], expected_closes: [101]});
  for (const file of Object.values(manifest.graphs)) await writeFile(join(source, file), 'abcdefghijk');
  for (const file of ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) await writeFile(join(root, 'node_modules/onnxruntime-web/dist', file), 'runtime');
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'vendor/onnxruntime-LICENSE.txt', 'tools/model-export/vendor/kronos/LICENSE','data/calendar/LICENSE','data/calendar/NOTICE']) await writeFile(join(root, file), 'license');
  await writeJson(join(root, '.cache/pages-history/BTC-USD.json'), history(btc));
  return {root, source, manifest};
}
test('hashed graph chunks round trip, honor the chunk limit and change with content', async t => {
  const {root, source} = await fixture(t);
  const target = join(root, 'packed');
  const graph = await packaging.packGraph(join(source, 'encoder.onnx'), target, 4);
  assert.equal(graph.bytes, 11);
  assert.deepEqual(graph.chunks.map(chunk => chunk.bytes), [4, 4, 3]);
  const buffers = await Promise.all(graph.chunks.map(async chunk => {
    const buffer = await readFile(join(target, chunk.file));
    assert.equal(createHash('sha256').update(buffer).digest('hex'), chunk.sha256);
    assert.equal(chunk.file, `${chunk.sha256}.bin`);
    return buffer;
  }));
  assert.equal(Buffer.concat(buffers).toString(), 'abcdefghijk');
  await writeFile(join(source, 'encoder.onnx'), 'ABCD');
  assert.notEqual((await packaging.packGraph(join(source, 'encoder.onnx'), target, 4)).chunks[0].file, graph.chunks[0].file);
  await assert.rejects(() => packaging.packGraph(join(source, 'encoder.onnx'), target, 16 * 1024 * 1024 + 1), /chunk/i);
});
test('export validation rejects changed source revision and path traversal', async t => {
  const {source, manifest} = await fixture(t);
  await writeJson(join(source, 'manifest.json'), {...manifest, revision: 'c'.repeat(40)});
  await assert.rejects(() => packaging.validateModelExport(source, profile), /revision/);
  await writeJson(join(source, 'manifest.json'), {...manifest, graphs: {...manifest.graphs, encoder: '../encoder.onnx'}});
  await assert.rejects(() => packaging.validateModelExport(source, profile), /graph|path/i);
});
test('incomplete prepared exports explain how to restore or export the missing graph', async t => {
  const {source} = await fixture(t);
  await rm(join(source, 'stage2.onnx'));
  await assert.rejects(() => packaging.validateModelExport(source, profile), /tools\/model-export\/export.py/);
});
test('offline preparation emits compatible catalogs, runtime, hashes, licenses and missing states', async t => {
  const {root} = await fixture(t);
  await writeFile(join(root, 'public/favicon.svg'), '<svg/>');
  const summary = await preparation.prepareAssets({root, offlineData: true, now: new Date('2025-03-06Z'), warn: () => {}});
  assert.equal(summary.snapshots, 1);
  const assets = await readJson(join(root, 'public/data/assets.json'));
  assert.deepEqual(assets.unavailable, ['ETH-USD']);
  assert.deepEqual(assets.assets.map(asset => asset.available), [true, false]);
  const models = await readJson(join(root, 'public/data/models.json'));
  assert.equal(models.default, 'mini');
  assert.equal(models.models[0].manifest, 'models/mini/manifest.json');
  const manifest = await readJson(join(root, 'public/models/mini/manifest.json'));
  assert.equal(manifest.format, 1);
  assert.equal(manifest.revision, profile.revision);
  assert.equal(manifest.graphs.encoder.bytes, 11);
  assert.equal(await readFile(join(root, 'public/runtime/ort.webgpu.min.mjs'), 'utf8'), 'runtime');
  assert.equal(await readFile(join(root, 'public/KRONOS-LICENSE.txt'), 'utf8'), 'license');
  assert.equal(await readFile(join(root, 'public/CALENDAR-LICENSE.txt'), 'utf8'), 'license');
  assert.equal(await readFile(join(root, 'public/CALENDAR-NOTICE.txt'), 'utf8'), 'license');
  assert.equal(await readFile(join(root, 'public/favicon.svg'), 'utf8'), '<svg/>');
  assert.deepEqual(await readJson(join(root, 'public/data/history/BTC-USD.json')), history(btc));
});
test('outage keeps prior snapshot provenance and successful refresh replaces it', async t => {
  const {root} = await fixture(t);
  await preparation.prepareAssets({root, symbols: ['BTC-USD'], loader: async () => {throw Error('provider outage');}, warn: () => {}});
  assert.deepEqual(await readJson(join(root, 'public/data/history/BTC-USD.json')), history(btc));
  await preparation.prepareAssets({root, symbols: ['BTC-USD'], now: new Date('2025-03-07T00:00:00Z'), loader: async () => history(btc).candles, warn: () => {}});
  const refreshed = await readJson(join(root, '.cache/pages-history/BTC-USD.json'));
  assert.equal(refreshed.source, 'Yahoo Finance via yahoo-finance2');
  assert.equal(refreshed.fetched_at, '2025-03-07T00:00:00.000Z');
});
test('missing model cache and zero real snapshots fail explicitly without replacing public output', async t => {
  const {root, source} = await fixture(t);
  await writeFile(join(root, 'public/keep.txt'), 'keep');
  await rm(join(source, 'manifest.json'));
  await assert.rejects(() => preparation.prepareAssets({root, offlineData: true}), /tools\/model-export\/export.py/);
  assert.equal(await readFile(join(root, 'public/keep.txt'), 'utf8'), 'keep');
  const second = await fixture(t);
  await assert.rejects(() => preparation.prepareAssets({root: second.root, offlineData: true, symbols: ['ETH-USD'], warn: () => {}}), /No real market snapshots/);
});
test('subsets reject unknown identifiers and artifact budget is enforced before publishing', async t => {
  const {root} = await fixture(t);
  await assert.rejects(() => preparation.prepareAssets({root, symbols: ['UNKNOWN']}), /supported|unknown/i);
  await assert.rejects(() => preparation.prepareAssets({root, models: ['UNKNOWN']}), /supported|unknown/i);
  await assert.rejects(() => preparation.prepareAssets({root, offlineData: true, maxBytes: 10, warn: () => {}}), /Artifact too large/);
  assert.deepEqual(preparation.parseArguments(['--offline-data', '--models', 'mini,base', '--symbols', 'AAPL', 'BTC-USD']), {offlineData: true, models: ['mini', 'base'], symbols: ['AAPL', 'BTC-USD']});
  assert.throws(() => preparation.parseArguments(['--models']), /requires/);
});
test('snapshot validation rejects a stale as_of, unsorted candles and incorrect forecast sessions', () => {
  assert.throws(() => market.validateHistory({...history(btc), as_of: '2025-03-04'}), /as_of/);
  assert.throws(() => market.validateHistory({...history(btc), candles: history(btc).candles.reverse()}), /sorted/);
  assert.throws(() => market.validateHistory({...history(btc), future_dates: ['2025-03-05', ...history(btc).future_dates.slice(1)]}), /future/);
});
test('cleanup refuses linked generated directories and does not touch their targets', async t => {
  const {root} = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), 'stock-assets-outside-'));
  t.after(() => rm(outside, {recursive: true, force: true}));
  await writeFile(join(outside, 'keep.txt'), 'safe');
  try {await symlink(outside, join(root, 'public/data'), 'junction');}
  catch (error) {if (error.code === 'EPERM') return t.skip('Windows account cannot create junctions'); throw error;}
  await assert.rejects(() => preparation.prepareAssets({root, offlineData: true, warn: () => {}}), /symlink|linked|inside/i);
  assert.equal(await readFile(join(outside, 'keep.txt'), 'utf8'), 'safe');
});
