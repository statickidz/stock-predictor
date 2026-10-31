import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fetchHistory, validateHistory} from './lib/market.mjs';

// Deliberately independent of model preparation and the website build.
export async function refreshMarket({assets, output, loader, now = new Date(), warn = console.warn}) {
  const snapshots = [];
  let retained = 0;
  for (const asset of assets) {
    if (!/^[A-Za-z0-9^=.-]+$/.test(asset.symbol)) throw new Error('Unsafe asset symbol');
    let history;
    try { history = validateHistory(await fetchHistory(asset, {loader, now}), asset); }
    catch (error) {
      warn(`Snapshot warning ${asset.symbol}: ${error.message}`);
      try {
        history = validateHistory(JSON.parse(await readFile(join(output, 'history', `${asset.symbol}.json`), 'utf8')), asset);
        retained++;
      } catch { history = null; }
    }
    snapshots.push({asset, history});
  }
  if (!snapshots.some(item => item.history)) throw new Error('No real market snapshots available; refusing empty publication.');
  // Finish fetching/validation before touching the publication directory.
  await mkdir(join(output, 'history'), {recursive:true});
  for (const {asset, history} of snapshots) {
    if (history) await writeFile(join(output, 'history', `${asset.symbol}.json`), JSON.stringify(history));
  }
  const catalog = {assets:snapshots.map(({asset,history})=>({...asset,available:Boolean(history)})), built_at:new Date(now).toISOString(), unavailable:snapshots.filter(item=>!item.history).map(item=>item.asset.symbol)};
  await writeFile(join(output, 'assets.json'), JSON.stringify(catalog));
  return {snapshots:snapshots.filter(item=>item.history).length, retained, unavailable:catalog.unavailable};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const assets = JSON.parse(await readFile(new URL('../data/assets.json', import.meta.url), 'utf8'));
    const result = await refreshMarket({assets, output:resolve(process.argv[2] || '.cache/market-branch/data'), warn:message=>console.warn(`::warning::${message}`)});
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
