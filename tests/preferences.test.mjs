import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences,writePreferences,preferencesKey} from '../src/lib/preferences.js';
test('preferences survive round-trip and reject invalid option values',()=>{
 const storage={value:null,getItem(){return this.value},setItem(key,value){assert.equal(key,preferencesKey);this.value=value}};
 writePreferences(storage,{market:'crypto',symbol:'BTC-USD',horizon:20,range:12,model:'small',runtime:'webgpu',disclosures:{0:true}});
 assert.deepEqual(readPreferences(storage),{market:'crypto',symbol:'BTC-USD',horizon:20,range:12,model:'small',runtime:'webgpu',disclosures:{0:true}});
 storage.value=JSON.stringify({market:'invalid',horizon:999,range:-1,runtime:'invalid'});
 assert.equal(readPreferences(storage).horizon,10);assert.equal(readPreferences(storage).range,3);assert.equal(readPreferences(storage).runtime,'wasm');
});
test('corrupt or blocked storage never prevents startup or selection changes',()=>{
 assert.deepEqual(readPreferences({getItem(){return '{'}}),{});
 assert.deepEqual(readPreferences({getItem(){throw Error('blocked')}}),{});
 assert.doesNotThrow(()=>writePreferences({setItem(){throw Error('quota')}},{horizon:5}));
 assert.deepEqual(readPreferences(undefined),{});
});
