import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/puzzle-maker/' : '/',
  server: { watch: { ignored: ['**/.browser-check/**'] } },
  build: { sourcemap: false },
}));
