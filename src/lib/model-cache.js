import {assetUrl} from './asset-url.js';

export const cacheName = `stock-predictor-models-v1:${assetUrl('')}`;

export async function verifiedChunk(url, chunk, storage = globalThis.caches, fetcher = fetch) {
  let cache;
  try { cache = await storage?.open(cacheName); } catch { /* Private mode: memory-only downloads. */ }
  const valid = async response => {
    if (!response?.ok) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== chunk.bytes) return null;
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
    return digest === chunk.sha256 ? bytes : null;
  };
  let cached;
  try { cached = await cache?.match(url); } catch { cache = undefined; }
  if (cached) {
    const bytes = await valid(cached);
    if (bytes) return bytes;
    try { await cache.delete(url); } catch { cache = undefined; }
  }
  const response = await fetcher(url, {signal: AbortSignal.timeout(120000)});
  const bytes = await valid(response);
  if (!bytes) throw new Error('Model download is incomplete or failed its integrity check. Retry the download.');
  try { await cache?.put(url, new Response(bytes)); } catch { /* A full cache must not prevent inference. */ }
  return bytes;
}

export async function graphBytes(base, graph, progress) {
  const output = new Uint8Array(graph.bytes);
  let offset = 0;
  for (const chunk of graph.chunks) {
    const bytes = await verifiedChunk(new URL(chunk.file, base).href, chunk);
    output.set(new Uint8Array(bytes), offset);
    offset += bytes.byteLength;
    progress(offset, graph.bytes);
  }
  if (offset !== graph.bytes) throw new Error('Model manifest has an invalid size. Rebuild the site.');
  return output;
}
