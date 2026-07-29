import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The preview sandbox forbids localStorage / IndexedDB. The app never uses
 * TF.js browser-storage model IO, but tfjs-core imports those handlers
 * unconditionally to register its routers, so we redirect them to no-op shims.
 */
function stubTfjsBrowserStorage() {
  const map = {
    indexed_db: r('./src/shims/tfjs-indexed-db.js'),
    local_storage: r('./src/shims/tfjs-local-storage.js'),
  };
  return {
    name: 'stub-tfjs-browser-storage',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      const base = source.replace(/\.js$/, '').split('/').pop();
      if (!(base in map)) return null;
      const resolved = path.resolve(path.dirname(importer), source);
      if (!resolved.includes(`${path.sep}tfjs-core${path.sep}`)) return null;
      return map[base];
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [stubTfjsBrowserStorage(), react()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
