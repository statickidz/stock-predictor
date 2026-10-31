import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Pages automatically rebuilds invalid models and saves a replaceable cache generation', async () => {
  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(workflow, /Explain missing bootstrap|!inputs\.prepare_models/);
  for (const name of ['Model-export Python environment', 'Prepare missing or invalid models']) {
    assert.ok(workflow.includes(`- name: ${name}\n        if: steps.models.outcome == 'failure' || inputs.prepare_models`));
  }
  assert.match(workflow, /restore-keys: browser-models-v3-/);
  assert.match(workflow, /github\.run_id.*github\.run_attempt/);
  assert.ok(workflow.includes("- name: Save prepared exports\n        if: steps.models.outcome == 'failure' || inputs.prepare_models"));
  assert.match(workflow, /node scripts\/check-models\.mjs\n      - name: Save prepared exports/);
});
