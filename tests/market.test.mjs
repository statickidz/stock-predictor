import test from 'node:test';
import assert from 'node:assert/strict';

const market = await import('../scripts/lib/market.mjs').catch(() => ({}));
const stock = {symbol: 'AAPL', kind: 'stock'};
const crypto = {symbol: 'BTC-USD', kind: 'crypto'};
const candle = date => ({date, open: 100, high: 102, low: 99, close: 101, volume: 1000});
const days = (start, count) => Array.from({length: count}, (_, i) => candle(new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10)));
const stockRows = () => days('2025-01-01', 184);

test('stock forecast skips July 4 holiday and weekend; crypto uses UTC days', () => {
  assert.deepEqual(market.futureDates('stock', '2025-07-03', 5), ['2025-07-07', '2025-07-08', '2025-07-09', '2025-07-10', '2025-07-11']);
  assert.deepEqual(market.futureDates('crypto', '2025-07-03', 3), ['2025-07-04', '2025-07-05', '2025-07-06']);
});
test('early close candle waits the full one-minute completion margin', () => {
  assert.equal(market.normalizeHistory(stockRows(), stock, new Date('2025-07-03T17:00:59Z')).at(-1).date, '2025-07-02');
  assert.equal(market.normalizeHistory(stockRows(), stock, new Date('2025-07-03T17:01:00Z')).at(-1).date, '2025-07-03');
});
test('normalization sorts, keeps last duplicate and removes invalid prices and volume', () => {
  const rows = [...stockRows().reverse(), {...candle('2025-07-03'), close: 100.5},
    {...candle('2025-07-02'), close: NaN}, {...candle('2025-07-01'), high: 50},
    {...candle('2025-06-30'), volume: -1}, {...candle('2025-06-27'), open: 0},
    {...candle('2025-06-26'), low: 102}, {...candle('2025-06-25'), volume: null}];
  const result = market.normalizeHistory(rows, stock, new Date('2025-07-05T00:00:00Z'));
  assert.equal(result.at(-1).close, 100.5);
  assert.equal(result.at(-2).date, '2025-06-24');
  assert.ok(result.every((row, i) => !i || result[i - 1].date < row.date));
});
test('crypto excludes the current UTC day and caps history at 512', () => {
  assert.equal(market.normalizeHistory(days('2025-04-01', 94), crypto, new Date('2025-07-03T23:59:59Z')).at(-1).date, '2025-07-02');
  assert.equal(market.normalizeHistory(days('2023-01-01', 900), crypto, new Date('2026-01-01T00:00:00Z')).length, 512);
});
test('64 valid completed candles are required and missing OHLCV fails', () => {
  assert.throws(() => market.normalizeHistory(days('2025-01-01', 63), crypto, new Date('2026-01-01Z')), /64/);
  assert.equal(market.normalizeHistory(days('2025-01-01', 64), crypto, new Date('2026-01-01Z')).length, 64);
  assert.throws(() => market.normalizeHistory([{date: '2025-01-01', close: 1}], crypto), /OHLCV/);
});
test('calendar lookup fails beyond supported coverage instead of inventing sessions', () => {
  assert.throws(() => market.futureDates('stock', '2035-12-31', 20), /calendar.*(coverage|range|exhaust)/i);
  assert.throws(() => market.normalizeHistory([candle('2019-12-31')], stock), /calendar.*(coverage|range|exhaust)/i);
});
test('ordinary closes track daylight saving time and exceptional exchange holidays', () => {
  const rows = days('2024-08-01', 220);
  assert.equal(market.normalizeHistory(rows, stock, new Date('2025-03-07T21:00:59Z')).at(-1).date, '2025-03-06');
  assert.equal(market.normalizeHistory(rows, stock, new Date('2025-03-07T21:01:00Z')).at(-1).date, '2025-03-07');
  assert.deepEqual(market.futureDates('stock', '2025-01-08', 2), ['2025-01-10', '2025-01-13']);
});
test('Yahoo adapter adjusts OHLC using adjusted close without adjusting volume', () => {
  const result = market.adjustYahooQuotes([{date: new Date('2025-01-03T14:30:00Z'), open: 100, high: 120, low: 80, close: 110, adjclose: 55, volume: 123}]);
  assert.deepEqual(result, [{date: '2025-01-03', open: 50, high: 60, low: 40, close: 55, volume: 123}]);
  assert.equal(market.adjustYahooQuotes([{date: new Date('2025-01-03Z'), open: 1, high: 2, low: 1, close: 2, volume: 10}])[0].close, null);
});
