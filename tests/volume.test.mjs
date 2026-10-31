import test from 'node:test';import assert from 'node:assert/strict';import {decodeForecast} from '../src/lib/inference-core.js';
test('decoder reads future close and volume channels across samples with separate normalization',()=>{
 const p={length:2,horizon:2,mean:[0,0,0,100,1000],std:[0,0,0,10,100]};const values=new Float32Array(2*4*6).fill(999);
 for(let b=0;b<2;b++)for(let i=0;i<2;i++){values[(b*4+2+i)*6+3]=b+i;values[(b*4+2+i)*6+4]=b-i;}
 const r=decodeForecast(values,p,2);assert.ok(Math.abs(r.closes[0]-105.000005)<1e-6);assert.ok(Math.abs(r.volumes[0]-1050.000005)<1e-6);assert.ok(Math.abs(r.volumes[1]-949.999995)<1e-6);
 values[2*6+4]=-100;values[6*6+4]=-100;assert.equal(decodeForecast(values,p,2).volumes[0],0);
 values[2*6+4]=NaN;assert.throws(()=>decodeForecast(values,p,2),/invalid/);
});
