import {prepare} from './inference-core.js';

export function forecastInput(history, horizon) {
  if (!history.future_dates || history.future_dates.length < horizon) throw new Error('Not enough future session dates. Rebuild the snapshots or import a file with 20 future dates.');
  return {candles: history.candles, future_dates: history.future_dates.slice(0, horizon)};
}

export function importedHistory(input) {
  if (!Array.isArray(input.candles) || input.candles.length < 64) throw new Error('Import at least 64 daily OHLCV candles.');
  const history = {...input, asset: {symbol:'IMPORT', name: String(input.label || 'Imported history').slice(0,80), kind: input.kind === 'crypto' ? 'crypto' : 'stock', exchange:'Local file', currency:'USD'},
    as_of: input.candles.at(-1).date, fetched_at: new Date().toISOString(), source:'Local JSON import', adjusted: false};
  prepare(forecastInput(history, 20));
  // Validate every candle, including older candles outside the inference window.
  for (let i = 0; i < history.candles.length; i += 128) {
    const start = Math.max(0, i - 1);
    prepare({candles: history.candles.slice(start, i + 256), future_dates: history.future_dates.slice(0,20)});
  }
  return history;
}

export async function staticJson(path) {
  const response = await fetch(new URL(path, import.meta.url), {cache:'no-cache'});
  if (!response.ok) throw new Error('This snapshot is unavailable. Try another asset or import local history.');
  return response.json();
}
