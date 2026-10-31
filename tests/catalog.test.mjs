import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('curated catalog supports all 130 unique USD stock and crypto assets', async () => {
  const assets = JSON.parse(await readFile(new URL('../data/assets.json', import.meta.url)));
  assert.equal(assets.length, 130);
  assert.equal(new Set(assets.map(asset => asset.symbol)).size, 130);
  assert.ok(assets.every(asset => asset.currency === 'USD' && ['stock', 'crypto'].includes(asset.kind)));
  assert.equal(assets.find(asset => asset.symbol === 'BTC-USD').kind, 'crypto');
});
test('every model profile pins source and tokenizer revisions', async () => {
  const models = JSON.parse(await readFile(new URL('../data/models.json', import.meta.url)));
  assert.deepEqual(models.map(model => model.key), ['mini', 'small', 'base']);
  assert.ok(models.every(model => /^[a-f0-9]{40}$/.test(model.revision) && /^[a-f0-9]{40}$/.test(model.tokenizer_revision)));
  assert.equal(models[0].model_id, 'NeoQuasar/Kronos-mini');
});
