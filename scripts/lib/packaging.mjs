import {createHash} from 'node:crypto';
import {open, mkdir, readFile, writeFile, lstat, realpath, readdir} from 'node:fs/promises';
import {basename, isAbsolute, join, relative, resolve, sep} from 'node:path';

export const CHUNK_BYTES = 16 * 1024 * 1024;
export const ARTIFACT_BUDGET = 950_000_000;
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value));
}

export function inside(root, target) {
  const path = relative(resolve(root), resolve(target));
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

// Check each existing component as well as the leaf: Windows junctions and
// directory symlinks must never redirect cleanup or generated asset writes.
export async function assertUnlinked(root, target) {
  if (!inside(root, target)) throw new Error('Generated output must remain inside the repository.');
  const parts = relative(resolve(root), resolve(target)).split(sep).filter(Boolean);
  let cursor = resolve(root);
  for (const part of ['', ...parts]) {
    if (part) cursor = join(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Refusing linked/symlink path: ${cursor}`);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function regularFile(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || !info.size) throw new Error(`Expected a nonempty regular file: ${path}`);
  return info;
}

export async function packGraph(source, target, chunkBytes = CHUNK_BYTES) {
  if (!Number.isInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > CHUNK_BYTES) throw new Error('Graph chunk size must be between 1 byte and 16 MiB.');
  const info = await regularFile(source);
  await mkdir(target, {recursive: true});
  const stream = await open(source, 'r');
  const chunks = [];
  let position = 0;
  try {
    while (position < info.size) {
      const buffer = Buffer.allocUnsafe(Math.min(chunkBytes, info.size - position));
      let filled = 0;
      while (filled < buffer.length) {
        const {bytesRead} = await stream.read(buffer, filled, buffer.length - filled, position + filled);
        if (!bytesRead) throw new Error(`Graph changed while packaging: ${source}`);
        filled += bytesRead;
      }
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const file = `${sha256}.bin`;
      await writeFile(join(target, file), buffer);
      chunks.push({file, sha256, bytes: buffer.length});
      position += buffer.length;
    }
    if ((await stream.stat()).size !== info.size) throw new Error(`Graph changed while packaging: ${source}`);
  } finally {await stream.close();}
  return {bytes: info.size, chunks};
}

export async function validateModelExport(source, profile) {
  try {return await validateExportFiles(source, profile);}
  catch (error) {
    if (error.code === 'ENOENT') throw missingExport(profile);
    throw error;
  }
}

function missingExport(profile) {
  return new Error(`Prepared ${profile.key} model is missing or invalid. Restore its prepared bundle to .cache/browser-models/${profile.key}, or run tools/model-export/export.py --model ${profile.key}. See tools/model-export/README.md.`);
}

async function validateExportFiles(source, profile) {
  let manifest;
  try {manifest = await readJson(join(source, 'manifest.json'));}
  catch {throw missingExport(profile);}
  await assertUnlinked(source, source);
  await regularFile(join(source, 'manifest.json'));
  for (const [field, expected] of Object.entries({model: profile.model_id, revision: profile.revision, tokenizer: profile.tokenizer_id, tokenizer_revision: profile.tokenizer_revision})) {
    if (!expected || manifest[field] !== expected) throw new Error(`${profile.key} model ${field}/revision does not match pinned data/models.json. Prepare a fresh export.`);
  }
  if (!Number.isInteger(manifest.context) || manifest.context < 64 || manifest.context > profile.max_context || !Number.isInteger(manifest.samples) || manifest.samples < 1) throw new Error(`Invalid context/samples in ${profile.key} model manifest.`);
  const graphNames = ['encoder', 'decoder', 'stage1', 'stage2'];
  if (!manifest.graphs || Object.keys(manifest.graphs).length !== graphNames.length) throw new Error(`Invalid ${profile.key} graph set.`);
  for (const name of graphNames) {
    const file = manifest.graphs[name];
    if (typeof file !== 'string' || basename(file) !== file || !/^[a-zA-Z0-9_-]+\.onnx$/.test(file)) throw new Error(`Invalid ${profile.key} graph path: ${name}`);
    await regularFile(join(source, file));
    if (!inside(await realpath(source), await realpath(join(source, file)))) throw new Error(`Graph must remain inside prepared export: ${name}`);
  }
  await regularFile(join(source, 'fixture.json'));
  const fixture = await readJson(join(source, 'fixture.json'));
  for (const field of ['forced_tokens', 'reference_logits', 'expected_closes']) {
    if (!Array.isArray(fixture[field]) || fixture[field].length === 0) throw new Error(`Missing ${profile.key} parity fixture ${field}.`);
  }
  return manifest;
}

export async function directoryBytes(directory, exclude = new Set()) {
  let total = 0;
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (exclude.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing linked/symlink output: ${path}`);
    total += entry.isDirectory() ? await directoryBytes(path) : (await lstat(path)).size;
  }
  return total;
}
