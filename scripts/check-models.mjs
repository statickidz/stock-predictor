import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertUnlinked,validateModelExport} from './lib/packaging.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function checkModelInputs(root=projectRoot, keys=['mini','small','base']) {
  const profiles=JSON.parse(await readFile(join(root,'data/models.json'),'utf8'));
  const selected=[];
  for(const key of keys){
    const profile=profiles.find(p=>p.key===key);
    if(!profile)throw Error(`Unsupported model: ${key}`);
    const directory=join(root,'.cache/browser-models',key);
    await assertUnlinked(root,directory);
    await validateModelExport(directory,profile);
    selected.push(profile);
  }
  return selected;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const profiles=await checkModelInputs(projectRoot,process.argv.slice(2).length?process.argv.slice(2):undefined);console.log(`Prepared model inputs verified: ${profiles.map(p=>p.key).join(', ')}`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
