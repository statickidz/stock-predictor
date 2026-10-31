import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectionState, toCsv, historyForRange } from '../src/lib/state.js';

test('obsolete history and job responses cannot commit after a selection change', () => {
  const state = createSelectionState();
  const first = state.begin();
  const second = state.begin();
  const rendered = [];
  assert.equal(state.commit(first, () => rendered.push('wrong asset')), false);
  assert.equal(state.commit(second, () => rendered.push('selected asset')), true);
  assert.deepEqual(rendered, ['selected asset']);
  assert.equal(state.isCurrent(first), false);
});

test('CSV exports exact forecast dates, symbols, prices and currency with escaped fields', () => {
  const result = {asset: {symbol: 'BTC-USD', currency: 'USD'}, model:{id:'NeoQuasar/Kronos-base'}, forecast: [{date: '2026-11-01', close: 80123.45}, {date: '2026-11-02', close: 80200}]};
  assert.equal(toCsv(result), 'symbol,date,projected_close,currency,model\r\n"BTC-USD","2026-11-01","80123.45","USD","NeoQuasar/Kronos-base"\r\n"BTC-USD","2026-11-02","80200","USD","NeoQuasar/Kronos-base"\r\n');
  assert.ok(toCsv({...result, asset: {symbol: 'A"B', currency: 'USD'}}).includes('"A""B"'));
});

test('chart month and year ranges use calendar dates for crypto and stocks', () => {
  const candles = ['2025-10-29','2025-10-30','2026-07-29','2026-07-30','2026-10-30'].map(date => ({date,close:100}));
  assert.deepEqual(historyForRange(candles,12).map(point=>point.date), ['2025-10-30','2026-07-29','2026-07-30','2026-10-30']);
  assert.deepEqual(historyForRange(candles,3).map(point=>point.date), ['2026-07-30','2026-10-30']);
});

test('month range clamps month-end instead of overflowing into the following month', () => {
  const candles = ['2026-04-29','2026-04-30','2026-05-01','2026-05-31'].map(date=>({date,close:100}));
  assert.deepEqual(historyForRange(candles,1).map(point=>point.date),['2026-04-30','2026-05-01','2026-05-31']);
});
