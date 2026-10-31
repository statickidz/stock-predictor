import {copyFile, mkdir, mkdtemp, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {fetchHistory, validateHistory} from './lib/market.mjs';
import {ARTIFACT_BUDGET, assertUnlinked, directoryBytes, packGraph, readJson, validateModelExport, writeJson} from './lib/packaging.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const generatedDirectories = ['data', 'models', 'runtime'];
const generatedFiles = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'KRONOS-LICENSE.txt', 'ONNXRUNTIME-LICENSE.txt', 'CALENDAR-LICENSE.txt', 'CALENDAR-NOTICE.txt', '.nojekyll'];

export function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--offline-data') options.offlineData = true;
    else if (['--models', '--symbols'].includes(args[i])) {
      const key = args[i].slice(2);
      const values = [];
      while (i + 1 < args.length && !args[i + 1].startsWith('--')) values.push(...args[++i].split(',').filter(Boolean));
      if (!values.length) throw new Error(`--${key} requires at least one value.`);
      options[key] = [...new Set(values)];
    } else throw new Error(`Unknown preparation option: ${args[i]}`);
  }
  return options;
}

function select(catalog, requested, key, label) {
  if (!requested) return catalog;
  if (!requested.length) throw new Error(`Choose at least one supported ${label}.`);
  for (const value of requested) if (!catalog.some(item => item[key] === value)) throw new Error(`Unknown ${label}: ${value}. Choose a supported value.`);
  return catalog.filter(item => requested.includes(item[key]));
}

async function assertOutput(root, output) {
  await assertUnlinked(root, output);
  for (const name of [...generatedDirectories, ...generatedFiles]) await assertUnlinked(root, join(output, name));
}

async function prepareSnapshots({root, selected, offlineData, loader, now, stage, warn}) {
  const cache = join(root, '.cache/pages-history');
  await assertUnlinked(root, cache);
  await mkdir(cache, {recursive: true});
  const assets = [], unavailable = [];
  let snapshots = 0;
  await mkdir(join(stage, 'data/history'), {recursive: true});
  for (const asset of selected) {
    const path = join(cache, `${asset.symbol}.json`);
    await assertUnlinked(root, path);
    let history;
    try {
      if (offlineData) history = validateHistory(await readJson(path), asset);
      else {
        history = validateHistory(await fetchHistory(asset, {loader, now}), asset);
        // Only replace a previous real snapshot after the entire response passes.
        const temporary = `${path}.${process.pid}.tmp`;
        await assertUnlinked(root, temporary);
        await writeJson(temporary, history);
        await rename(temporary, path);
      }
    } catch (error) {
      warn(`Snapshot warning ${asset.symbol}: ${error.message}`);
      try {history = validateHistory(await readJson(path), asset);}
      catch {history = null;}
    }
    if (history) {
      await writeJson(join(stage, 'data/history', `${asset.symbol}.json`), history);
      snapshots++;
    } else unavailable.push(asset.symbol);
    assets.push({...asset, available: Boolean(history)});
  }
  if (!snapshots) throw new Error('No real market snapshots available; refusing to publish an empty site. Restore .cache/pages-history or run assets:prepare with provider access.');
  await writeJson(join(stage, 'data/assets.json'), {assets, built_at: new Date(now).toISOString(), unavailable});
  return {snapshots, unavailable};
}

export async function prepareAssets({root = projectRoot, models, symbols, offlineData = false, loader, now = new Date(), warn = console.warn, maxBytes = ARTIFACT_BUDGET} = {}) {
  root = resolve(root);
  const output = join(root, 'public');
  await assertOutput(root, output);
  const assets = select(await readJson(join(root, 'data/assets.json')), symbols, 'symbol', 'asset');
  const profiles = select(await readJson(join(root, 'data/models.json')), models, 'key', 'model');
  const verified = [];
  for (const profile of profiles) {
    const source = join(root, '.cache/browser-models', profile.key);
    await assertUnlinked(root, source);
    verified.push({profile, source, manifest: await validateModelExport(source, profile)});
  }
  const cache = join(root, '.cache');
  await assertUnlinked(root, cache);
  await mkdir(cache, {recursive: true});
  const stage = await mkdtemp(join(cache, 'asset-preparation-'));
  try {
    await mkdir(join(stage, 'data'), {recursive: true});
    const catalog = [];
    for (const {profile, source, manifest} of verified) {
      const target = join(stage, 'models', profile.key);
      await mkdir(target, {recursive: true});
      const graphs = {};
      for (const [name, file] of Object.entries(manifest.graphs)) graphs[name] = await packGraph(join(source, file), target);
      await writeJson(join(target, 'manifest.json'), {...manifest, graphs, format: 1});
      await copyFile(join(source, 'fixture.json'), join(target, 'fixture.json'));
      catalog.push({...profile, manifest: `models/${profile.key}/manifest.json`, bytes: Object.values(graphs).reduce((total, graph) => total + graph.bytes, 0)});
    }
    await writeJson(join(stage, 'data/models.json'), {models: catalog, default: catalog[0].key});
    const snapshots = await prepareSnapshots({root, selected: assets, offlineData, loader, now, stage, warn});
    const runtime = join(root, 'node_modules/onnxruntime-web/dist');
    let runtimeFiles;
    try {runtimeFiles = (await readdir(runtime)).filter(file => file === 'ort.webgpu.min.mjs' || /^ort-wasm-.*\.(mjs|wasm)$/.test(file));}
    catch {throw new Error('Install the browser runtime first: pnpm install --frozen-lockfile --ignore-scripts');}
    if (!runtimeFiles.includes('ort.webgpu.min.mjs') || !runtimeFiles.some(file => file.endsWith('.wasm')) || !runtimeFiles.some(file => file.startsWith('ort-wasm-') && file.endsWith('.mjs'))) throw new Error('Browser runtime files are incomplete; reinstall onnxruntime-web.');
    await mkdir(join(stage, 'runtime'));
    for (const file of runtimeFiles) await copyFile(join(runtime, file), join(stage, 'runtime', file));
    for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) await copyFile(join(root, file), join(stage, file));
    await copyFile(join(root, 'tools/model-export/vendor/kronos/LICENSE'), join(stage, 'KRONOS-LICENSE.txt'));
    await copyFile(join(root, 'vendor/onnxruntime-LICENSE.txt'), join(stage, 'ONNXRUNTIME-LICENSE.txt'));
    await copyFile(join(root, 'vendor/onnxruntime-LICENSE.txt'), join(stage, 'runtime/LICENSE.txt'));
    await copyFile(join(root, 'data/calendar/LICENSE'), join(stage, 'CALENDAR-LICENSE.txt'));
    await copyFile(join(root, 'data/calendar/NOTICE'), join(stage, 'CALENDAR-NOTICE.txt'));
    await writeFile(join(stage, '.nojekyll'), '');
    await mkdir(output, {recursive: true});
    const size = await directoryBytes(stage) + await directoryBytes(output, new Set([...generatedDirectories, ...generatedFiles]));
    if (size > maxBytes) throw new Error(`Artifact too large for Pages: ${size} bytes (budget ${maxBytes}).`);
    // Do not clean a generated subtree until all input, data and budget checks pass.
    await assertOutput(root, output);
    for (const name of [...generatedDirectories, ...generatedFiles]) {
      const target = join(output, name);
      await assertUnlinked(root, target);
      await rm(target, {recursive: true, force: true});
      await rename(join(stage, name), target);
    }
    return {output, bytes: size, models: catalog.length, ...snapshots};
  } finally {
    await assertUnlinked(root, stage);
    await rm(stage, {recursive: true, force: true});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await prepareAssets(parseArguments(process.argv.slice(2)));
    console.log(`Prepared browser assets: ${result.output} (${(result.bytes / 1e6).toFixed(1)} MB); ${result.models} models; ${result.snapshots} snapshots`);
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
