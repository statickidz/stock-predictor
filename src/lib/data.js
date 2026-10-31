import {assetUrl} from './asset-url.js';

export function forecastInput(history, horizon) {
  if (!history.future_dates || history.future_dates.length < horizon) throw new Error('Not enough future session dates. Choose another asset or rebuild the snapshots.');
  return {candles: history.candles, future_dates: history.future_dates.slice(0, horizon)};
}

export async function staticJson(path) {
  const response = await fetch(assetUrl(path), {cache:'no-cache'});
  if (!response.ok) throw new Error('This snapshot is unavailable. Choose another asset or retry later.');
  return response.json();
}
