import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifiedChunk} from '../src/lib/model-cache.js';

test('a corrupted cached model is replaced with verified network content', async () => {
  const chunk = {bytes:4,sha256:createHash('sha256').update('good').digest('hex')};
  let saved, deleted = false, requests = 0;
  const storage = {open: async () => ({match:async()=>new Response('evil'), delete:async()=>{deleted=true;}, put:async(_,r)=>{saved=await r.text();}})};
  const result = await verifiedChunk('https://example.test/model',chunk,storage,async()=>{requests++;return new Response('good');});
  assert.equal(new TextDecoder().decode(result),'good');
  assert.equal(saved,'good'); assert.equal(deleted,true); assert.equal(requests,1);
});

test('bad network content is rejected and quota errors do not block valid inference', async () => {
  const chunk = {bytes:4,sha256:createHash('sha256').update('good').digest('hex')};
  await assert.rejects(verifiedChunk('https://example.test/model',chunk,null,async()=>new Response('evil')),/integrity/);
  const unavailable = {open:async()=>{throw new Error('denied');}};
  assert.equal((await verifiedChunk('https://example.test/model',chunk,unavailable,async()=>new Response('good'))).byteLength,4);
});
