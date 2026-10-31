import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forecastInput, importedHistory} from '../src/lib/data.js';

test('forecast uses provided trading sessions across a holiday', () => {
  const history = {candles: [{date:'2026-11-25'}], future_dates:['2026-11-27','2026-11-30','2026-12-01','2026-12-02','2026-12-03']};
  assert.deepEqual(forecastInput(history, 5).future_dates, history.future_dates);
  assert.throws(() => forecastInput(history, 10), /dates/);
});

test('imports reject too-short, unordered and invalid OHLCV histories', () => {
  assert.throws(() => importedHistory({candles:[]}), /64/);
  const candles = Array.from({length:64}, (_,i) => ({date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),open:10,high:12,low:9,close:11,volume:100}));
  const future_dates = Array.from({length:20},(_,i)=>new Date(Date.UTC(2026,0,65+i)).toISOString().slice(0,10));
  const result = importedHistory({label:'My data',candles,future_dates});
  assert.equal(result.asset.symbol,'IMPORT');
  assert.equal(result.source,'Local JSON import');
  candles[1].date = candles[0].date;
  assert.throws(() => importedHistory({candles,future_dates}), /increasing/);
});
