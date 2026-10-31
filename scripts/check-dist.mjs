import {readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
let bytes=0,files=0;
async function scan(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,entry.name),info=await lstat(path);
    if(info.isSymbolicLink())throw Error(`Deployment must not contain links: ${path}`);
    if(/^(node_modules|tools|\.env(?:\..*)?)$/.test(entry.name)||/\.(?:py|pt|pth|safetensors)$/.test(entry.name))throw Error(`Development file in deployment: ${path}`);
    if(entry.isDirectory())await scan(path);else{bytes+=info.size;files++;}
  }
}
await scan(root);
if(bytes>950_000_000)throw Error(`Deployment artifact exceeds 950 MB budget: ${bytes} bytes`);
console.log(`Static artifact verified: ${files} files, ${(bytes/1e6).toFixed(1)} MB`);
