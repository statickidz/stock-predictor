import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from '../src/lib/asset-url.js';

test('public data and models resolve at the deployment base, independent of bundled module paths', () => {
  assert.equal(assetUrl('data/assets.json', '/'), '/data/assets.json');
  assert.equal(assetUrl('models/mini/manifest.json', '/stock-predictor/'), '/stock-predictor/models/mini/manifest.json');
  assert.equal(assetUrl('runtime/ort.webgpu.min.mjs', '/research/stock-predictor'), '/research/stock-predictor/runtime/ort.webgpu.min.mjs');
  assert.equal(assetUrl('/data/models.json', '/stock-predictor/'), '/stock-predictor/data/models.json');
  assert.equal(assetUrl('runtime/'), '/runtime/');
});
