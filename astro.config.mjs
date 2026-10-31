import {defineConfig} from 'astro/config';

export default defineConfig({
  output: 'static',
  base: process.env.BASE_PATH || '/',
  site: process.env.SITE_URL || undefined,
  trailingSlash: 'always',
  vite: {
    worker: {format: 'es'},
    server: {
      // Optional Python environments and prepared model caches are not app sources.
      watch: {ignored: ['**/.venv/**', '**/.venv-models/**', '**/.cache/**']},
    },
  },
});
