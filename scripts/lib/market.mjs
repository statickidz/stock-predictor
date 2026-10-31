import {readFileSync} from 'node:fs';

export class MarketError extends Error {}

const calendar = JSON.parse(readFileSync(new URL('../../data/calendar/XNYS.json', import.meta.url), 'utf8'));
const closes = new Map(calendar.sessions.map(session => [session.date, Date.parse(session.close)]));
const required = ['open', 'high', 'low', 'close', 'volume'];

function dateString(value) {
  const day = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) {
    throw new MarketError('The provider returned an invalid daily candle date.');
  }
  return day;
}

function checkCoverage(day) {
  if (day < calendar.coverage.start || day > calendar.coverage.end) {
    throw new MarketError(`Trading calendar coverage is ${calendar.coverage.start} through ${calendar.coverage.end}; refresh data/calendar/XNYS.json.`);
  }
}

export function futureDates(kind, lastDate, horizon) {
  const last = dateString(lastDate);
  if (!Number.isInteger(horizon) || horizon < 0) throw new MarketError('Forecast horizon must be a non-negative integer.');
  if (kind === 'crypto') {
    return Array.from({length: horizon}, (_, i) => new Date(Date.parse(last) + (i + 1) * 86400000).toISOString().slice(0, 10));
  }
  if (kind !== 'stock') throw new MarketError('Choose a supported asset kind.');
  checkCoverage(last);
  const dates = calendar.sessions.filter(session => session.date > last).slice(0, horizon).map(session => session.date);
  if (dates.length !== horizon) throw new MarketError('Trading calendar coverage exhausted for these forecast dates; refresh data/calendar/XNYS.json.');
  return dates;
}

export function normalizeHistory(input, asset, now = new Date()) {
  if (!Array.isArray(input) || !input.length) throw new MarketError('No price history returned. Please try again shortly.');
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new MarketError('A valid UTC completion time is required.');
  if (!['stock', 'crypto'].includes(asset.kind)) throw new MarketError('Choose a supported asset kind.');
  const byDate = new Map();
  for (const original of input) {
    const record = Object.fromEntries(Object.entries(original).map(([key, value]) => [key.toLowerCase(), value]));
    if (!required.every(key => Object.hasOwn(record, key))) throw new MarketError('The provider returned incomplete OHLCV data. Please try again.');
    const date = dateString(record.date);
    byDate.set(date, {date, ...Object.fromEntries(required.map(key => [key, record[key] === null || record[key] === '' || record[key] === undefined ? NaN : Number(record[key])]))});
  }
  const rows = [];
  for (const row of [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!required.every(key => Number.isFinite(row[key])) || required.slice(0, 4).some(key => row[key] <= 0) || row.volume < 0) continue;
    if (row.low > Math.min(row.open, row.close) || row.high < Math.max(row.open, row.close)) continue;
    let complete;
    if (asset.kind === 'crypto') complete = row.date < instant.toISOString().slice(0, 10);
    else {
      checkCoverage(row.date);
      complete = closes.has(row.date) && closes.get(row.date) + 60000 <= instant.getTime();
    }
    if (complete) rows.push(row);
  }
  if (rows.length < 64) throw new MarketError('At least 64 valid completed daily candles are required. Please try another asset.');
  return rows.slice(-512);
}

// Yahoo chart returns raw OHLC plus dividend/split-adjusted close. Apply the
// same ratio to OHLC as yfinance auto_adjust=True; share volume stays unchanged.
export function adjustYahooQuotes(quotes) {
  return quotes.map(quote => {
    const ratio = typeof quote.adjclose === 'number' && typeof quote.close === 'number' && quote.close > 0 ? quote.adjclose / quote.close : NaN;
    return {date: dateString(quote.date instanceof Date ? quote.date : new Date(quote.date)),
      ...Object.fromEntries(['open', 'high', 'low', 'close'].map(key => [key, Number.isFinite(ratio) && typeof quote[key] === 'number' ? quote[key] * ratio : null])), volume: quote.volume};
  });
}

let yahoo;
export async function loadYahooHistory(symbol, now = new Date()) {
  if (!yahoo) {
    const {default: YahooFinance} = await import('yahoo-finance2');
    yahoo = new YahooFinance({suppressNotices: ['yahooSurvey']});
  }
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - 2);
  const result = await yahoo.chart(symbol, {period1: start, period2: now, interval: '1d', events: '', return: 'array'}, {fetchOptions: {signal: AbortSignal.timeout(20000)}});
  return adjustYahooQuotes(result.quotes);
}

export async function fetchHistory(asset, {loader = loadYahooHistory, now = new Date()} = {}) {
  const candles = normalizeHistory(await loader(asset.symbol, now), asset, now);
  const asOf = candles.at(-1).date;
  return {asset, candles, as_of: asOf, fetched_at: new Date(now).toISOString(), source: 'Yahoo Finance via yahoo-finance2', adjusted: true, future_dates: futureDates(asset.kind, asOf, 20)};
}

export function validateHistory(history, asset = history?.asset) {
  if (!asset || history?.asset?.symbol !== asset.symbol || history?.asset?.kind !== asset.kind || history.adjusted !== true || typeof history.source !== 'string' || !history.source.trim() || !Number.isFinite(Date.parse(history.fetched_at))) {
    throw new MarketError('Snapshot must identify its asset, real source, adjusted prices and fetch time.');
  }
  const candles = normalizeHistory(history.candles, asset, new Date(history.fetched_at));
  if (candles.length !== history.candles.length || candles.some((row, i) => row.date !== history.candles[i].date) || history.as_of !== candles.at(-1).date) {
    throw new MarketError('Invalid snapshot: candles must be valid, sorted, unique and completed with the correct as_of date.');
  }
  if (!Array.isArray(history.future_dates) || history.future_dates.length < 20) throw new MarketError('Invalid future session dates in snapshot.');
  const future = futureDates(asset.kind, history.as_of, history.future_dates.length);
  if (history.future_dates.some((day, i) => day !== future[i])) {
    throw new MarketError('Invalid future session dates in snapshot.');
  }
  return history;
}
