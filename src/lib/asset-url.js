// Public assets belong to the deployment root, never to a hashed JS/worker directory.
export function assetUrl(path, base = import.meta.env?.BASE_URL || '/') {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
