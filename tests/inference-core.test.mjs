import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepare, sample, stamp} from '../app/static/inference-core.js';

const input = () => ({
  candles: [
    {date: '2026-10-29', open: 10, high: 12, low: 9, close: 11, volume: 100},
    {date: '2026-10-30', open: 12, high: 14, low: 11, close: 13, volume: 200},
  ],
  future_dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
});

test('preprocessing uses six features, population std, and upstream weekday numbering', () => {
  const result = prepare(input());
  assert.deepEqual(result.mean, [11, 13, 10, 12, 150, 1775]);
  assert.deepEqual(result.std, [1, 1, 1, 1, 50, 725]);
  assert.ok(Math.abs(result.normalized[3] + 1 / 1.00001) < 1e-10);
  assert.deepEqual(result.times[2], [0, 0, 0, 2, 11]);
});

test('constant features remain finite', () => {
  const data = input();
  Object.assign(data.candles[1], {...data.candles[0], date: '2026-10-30'});
  assert.ok(prepare(data).normalized.every(n => n === 0));
});

test('rejects invalid dates, unordered dates and missing OHLCV', () => {
  assert.throws(() => stamp('2026-02-30'), /Invalid date/);
  const data = input();
  data.future_dates[0] = '2026-10-29';
  assert.throws(() => prepare(data), /increasing/);
  delete data.candles[0].close;
  data.future_dates[0] = '2026-11-02';
  assert.throws(() => prepare(data), /OHLC/);
});

test('top-p keeps the boundary-crossing token and excludes the tail', () => {
  const logits = Float32Array.from([0.8, 0.15, 0.05], Math.log);
  assert.equal(sample(logits, () => 0), 0);
  assert.equal(sample(logits, () => 0.99), 1);
  assert.equal(sample([1000, 0, -1000], () => 0.999), 0);
  assert.throws(() => sample([NaN]), /Invalid/);
});
