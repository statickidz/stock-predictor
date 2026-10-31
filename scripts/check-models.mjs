import {appendFile,readFile} from 'node:fs/promises';
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

export async function probeModelInputs(root=projectRoot, keys) {
  try { await checkModelInputs(root, keys); return true; }
  catch { return false; }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    if(process.argv.includes('--probe')) {
      const valid=await probeModelInputs();
      if(process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `valid=${valid}\n`);
      console.log(valid ? 'Prepared model cache verified.' : '::notice::Prepared model cache is missing or invalid; rebuilding automatically.');
    } else {const profiles=await checkModelInputs(projectRoot,process.argv.slice(2).length?process.argv.slice(2):undefined);console.log(`Prepared model inputs verified: ${profiles.map(p=>p.key).join(', ')}`);}}
  catch(error){console.error(error.message);process.exitCode=1;}
}
