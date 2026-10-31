// Pure preprocessing and sampling shared by the browser worker and Node checks.
const columns = ['open', 'high', 'low', 'close', 'volume'];

export function stamp(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Dates must use YYYY-MM-DD.');
  const d = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== date) throw new Error(`Invalid date: ${date}`);
  return [0, 0, (d.getUTCDay() + 6) % 7, d.getUTCDate(), d.getUTCMonth() + 1];
}

export function prepare(input) {
  if (!Array.isArray(input.candles) || input.candles.length < 2) throw new Error('Supply at least two OHLCV candles.');
  if (!Array.isArray(input.future_dates) || ![5, 10, 20].includes(input.future_dates.length)) {
    throw new Error('Supply 5, 10 or 20 future trading dates.');
  }
  const candles = input.candles.slice(-256);
  let previous = '';
  const times = [...candles.map(c => c.date), ...input.future_dates].map(date => {
    const result = stamp(date);
    if (date <= previous) throw new Error('Candle and future dates must be strictly increasing.');
    previous = date;
    return result;
  });
  const rows = candles.map(c => {
    const row = columns.map(key => c[key]);
    if (!row.every(Number.isFinite) || row.slice(0, 4).some(n => n <= 0) || row[4] < 0 ||
        c.low > Math.min(c.open, c.close) || c.high < Math.max(c.open, c.close)) {
      throw new Error('Candles must contain valid positive OHLC prices and nonnegative volume.');
    }
    row.push(row[4] * (row[0] + row[1] + row[2] + row[3]) / 4);
    return row.map(Math.fround);
  });
  const mean = Array.from({length: 6}, (_, j) => rows.reduce((s, r) => s + r[j], 0) / rows.length);
  const std = mean.map((m, j) => Math.sqrt(rows.reduce((s, r) => s + (r[j] - m) ** 2, 0) / rows.length));
  const normalized = rows.flatMap(row => row.map((v, j) => Math.max(-5, Math.min(5, (v - mean[j]) / (std[j] + 1e-5)))));
  return {normalized, mean, std, times, length: rows.length, horizon: input.future_dates.length};
}

export function sample(logits, random = Math.random) {
  if (!logits.length || !Array.from(logits).every(Number.isFinite)) throw new Error('Invalid model logits.');
  const max = Math.max(...logits);
  const weights = Array.from(logits, v => Math.exp(v - max));
  const sum = weights.reduce((a, b) => a + b, 0);
  const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
  // Keep the first token crossing top_p, matching upstream's shifted mask.
  let mass = 0;
  const keep = [];
  for (const index of order) {
    keep.push(index);
    mass += weights[index];
    if (mass / sum > 0.9) break;
  }
  let draw = random() * mass;
  for (const index of keep) {
    draw -= weights[index];
    if (draw < 0) return index;
  }
  return keep.at(-1);
}
