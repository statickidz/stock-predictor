import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../src/lib/inference-client.js', import.meta.url),'utf8')).replace(/^import .*;\r?\n/, "const workerUrl = 'worker.js';\n").replaceAll('export ', '');
function setup() {
  const workers=[];
  class Worker {
    constructor(){workers.push(this);this.terminated=false;}
    postMessage(data){this.request=data;}
    terminate(){this.terminated=true;}
    reply(data){this.onmessage({data:{requestId:this.request.requestId,...data}});}
  }
  const context=vm.createContext({Worker,DOMException});
  vm.runInContext(source+';globalThis.Client=BrowserInference;',context);
  return {client:new context.Client(),workers};
}
test('completed forecasts release worker memory before a new horizon runs',async()=>{
  const {client,workers}=setup();
  const first=client.predict({}, {}, 'wasm',()=>{});
  workers[0].reply({type:'result',closes:[1]});
  await first;
  assert.equal(workers[0].terminated,true);
  const next=client.predict({}, {}, 'wasm',()=>{});
  assert.equal(workers.length,2);
  workers[1].reply({type:'result',closes:[2]});
  assert.deepEqual((await next).closes,[2]);
});
test('GPU failure retries on CPU in a fresh worker and reports actual provider',async()=>{
  const {client,workers}=setup();
  const pending=client.predict({}, {}, 'webgpu',()=>{});
  workers[0].reply({type:'error',message:'device lost'});
  assert.equal(workers[0].terminated,true);
  assert.equal(workers.length,2);
  assert.equal(workers[1].request.provider,'wasm');
  workers[1].reply({type:'result',provider:'wasm'});
  assert.equal((await pending).provider,'wasm');
});
test('late errors from cancelled workers cannot stop the next forecast',async()=>{
  const {client,workers}=setup();
  const first=client.predict({}, {}, 'wasm',()=>{});
  const rejected=assert.rejects(first,{name:'AbortError'});
  client.cancel();
  const second=client.predict({}, {}, 'wasm',()=>{});
  workers[0].onerror();
  assert.equal(workers[1].terminated,false);
  workers[1].reply({type:'result'});
  await Promise.all([rejected,second]);
});

test('CPU failures reject and release memory without retry loops',async()=>{
  const {client,workers}=setup();
  const pending=client.predict({}, {}, 'wasm',()=>{});
  workers[0].reply({type:'error',message:'out of memory'});
  await assert.rejects(pending,/out of memory/);
  assert.equal(workers[0].terminated,true);
  assert.equal(workers.length,1);
});
test('cancelling a GPU fallback rejects the request and stops the CPU worker',async()=>{
  const {client,workers}=setup();
  const pending=client.predict({}, {}, 'webgpu',()=>{});
  workers[0].onerror();
  client.cancel();
  await assert.rejects(pending,{name:'AbortError'});
  assert.equal(workers[1].terminated,true);
});
