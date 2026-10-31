import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadStaticJson} from '../src/lib/data.js';
test('market data uses remote source while models stay bundled',async()=>{
  const calls=[];
  const fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>({ok:true})};};
  await loadStaticJson('data/history/AAPL.json',{marketBase:'https://example.com/data/',fetcher});
  await loadStaticJson('data/models.json',{marketBase:'https://example.com/data/',fetcher});
  assert.deepEqual(calls,['https://example.com/data/history/AAPL.json','/data/models.json']);
});
test('remote HTTP, network and JSON failures fall back to bundled market data',async()=>{
  for(const failure of ['http','network','json']) {
    const calls=[];
    const result=await loadStaticJson('data/assets.json',{marketBase:'https://example.com/data',fetcher:async url=>{
      calls.push(url);
      if(calls.length===1){if(failure==='network')throw Error('offline');return {ok:failure!=='http',json:async()=>{throw Error('invalid JSON');}};}
      return {ok:true,json:async()=>({assets:[]})};
    }});
    assert.deepEqual(result,{assets:[]});
    assert.equal(calls[1],'/data/assets.json');
  }
});
