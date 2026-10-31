import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkModelInputs} from '../scripts/check-models.mjs';

test('model preparation is explicit and rejects mixed model revisions',async()=>{
  const root=await mkdtemp(join(tmpdir(),'model-input-'));
  try {
    await mkdir(join(root,'data'));
    const profile={key:'mini',model_id:'NeoQuasar/Kronos-mini',tokenizer_id:'NeoQuasar/Kronos-Tokenizer-2k',revision:'model-rev',tokenizer_revision:'tokenizer-rev',max_context:2048};
    await writeFile(join(root,'data/models.json'),JSON.stringify([profile]));
    await assert.rejects(checkModelInputs(root,['mini']),/model-export/);
    const target=join(root,'.cache/browser-models/mini');await mkdir(target,{recursive:true});
    const manifest={model:profile.model_id,tokenizer:profile.tokenizer_id,revision:'wrong',tokenizer_revision:profile.tokenizer_revision,context:256,samples:3,
      graphs:{encoder:'encoder.onnx',decoder:'decoder.onnx',stage1:'stage1.onnx',stage2:'stage2.onnx'}};
    await writeFile(join(target,'manifest.json'),JSON.stringify(manifest));
    await assert.rejects(checkModelInputs(root,['mini']),/revision/);
    manifest.revision=profile.revision;
    await writeFile(join(target,'manifest.json'),JSON.stringify(manifest));
    for(const name of Object.values(manifest.graphs))await writeFile(join(target,name),'fixture bytes');
    await writeFile(join(target,'fixture.json'),JSON.stringify({forced_tokens:[1],reference_logits:[1],expected_closes:[1]}));
    assert.equal((await checkModelInputs(root,['mini']))[0].key,'mini');
    manifest.graphs.encoder='../encoder.onnx';
    await writeFile(join(target,'manifest.json'),JSON.stringify(manifest));
    await assert.rejects(checkModelInputs(root,['mini']),/graph/);
  }finally{await rm(root,{recursive:true,force:true});}
});
