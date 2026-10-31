export const preferencesKey = 'stock-predictor.preferences.v1';

export function readPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(preferencesKey));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return {
      market: ['stock', 'crypto'].includes(value.market) ? value.market : 'stock',
      symbol: typeof value.symbol === 'string' ? value.symbol : null,
      horizon: [5, 10, 20].includes(value.horizon) ? value.horizon : 10,
      range: [1, 3, 6, 12].includes(value.range) ? value.range : 3,
      model: typeof value.model === 'string' ? value.model : null,
      runtime: value.runtime === 'webgpu' ? 'webgpu' : 'wasm',
      disclosures: value.disclosures && typeof value.disclosures === 'object' ? value.disclosures : {},
    };
  } catch { return {}; }
}

export function writePreferences(storage, value) {
  try { storage.setItem(preferencesKey, JSON.stringify(value)); } catch { /* Private browsing and full storage must not block the workspace. */ }
}
