import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  // Prevent "dist/" from disappearing during `tsup --watch` startup (it breaks ESM consumers like @taskly/api).
  clean: !process.argv.includes('--watch'),
});


