import { defineConfig } from 'vite';

export default defineConfig({
  server: { watch: { ignored: ['**/.browser-check/**'] } },
  build: { sourcemap: false },
});
