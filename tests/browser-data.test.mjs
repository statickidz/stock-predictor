import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forecastInput} from '../src/lib/data.js';

test('forecast uses provided trading sessions across a holiday', () => {
  const history = {candles: [{date:'2026-11-25'}], future_dates:['2026-11-27','2026-11-30','2026-12-01','2026-12-02','2026-12-03']};
  assert.deepEqual(forecastInput(history, 5).future_dates, history.future_dates);
  assert.throws(() => forecastInput(history, 10), /dates/);
});
