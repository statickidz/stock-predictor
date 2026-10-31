export function createSelectionState() {
  let generation = 0;
  return {
    begin: () => ++generation,
    isCurrent: (id) => id === generation,
    commit(id, callback) {
      if (id !== generation) return false;
      callback();
      return true;
    },
  };
}

export function toCsv(result) {
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return 'symbol,date,projected_close,currency,model,projected_volume\r\n' + result.forecast.map((point) =>
    [result.asset.symbol, point.date, point.close, result.asset.currency, result.model.id, point.volume ?? ''].map(quote).join(',') + '\r\n'
  ).join('');
}

export function historyForRange(candles, months) {
  if (!candles.length) return [];
  const last = new Date(candles.at(-1).date + 'T00:00:00Z');
  const day = last.getUTCDate();
  last.setUTCDate(1);
  last.setUTCMonth(last.getUTCMonth() - months);
  const monthEnd = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0)).getUTCDate();
  last.setUTCDate(Math.min(day, monthEnd));
  const cutoff = last.toISOString().slice(0,10);
  return candles.filter(point => point.date >= cutoff);
}
