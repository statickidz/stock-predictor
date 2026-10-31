import {assetUrl} from './asset-url.js';

export function forecastInput(history, horizon) {
  if (!history.future_dates || history.future_dates.length < horizon) throw new Error('Not enough future session dates. Choose another asset or rebuild the snapshots.');
  return {candles: history.candles, future_dates: history.future_dates.slice(0, horizon)};
}

export async function loadStaticJson(path, {marketBase = '', fetcher = globalThis.fetch} = {}) {
  const bundled = assetUrl(path);
  const marketPath = path === 'data/assets.json' || /^data\/history\/[^/]+\.json$/.test(path);
  const read = async url => {
    const response = await fetcher(url, {cache:'no-cache', signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('This snapshot is unavailable. Choose another asset or retry later.');
    return response.json();
  };
  if (marketBase && marketPath) {
    try { return await read(`${marketBase.replace(/\/$/, '')}/${path.slice(5)}`); }
    catch { /* Keep the site usable during first publication or provider outages. */ }
  }
  return read(bundled);
}

export function staticJson(path) {
  return loadStaticJson(path, {marketBase:import.meta.env?.PUBLIC_MARKET_DATA_URL || ''});
}
