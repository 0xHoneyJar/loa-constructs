import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/types.ts', 'src/validation.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'node20',
  },
  {
    entry: ['src/error-capture.ts'],
    format: ['esm'],
    dts: { compilerOptions: { lib: ['ES2022', 'DOM'] } },
    sourcemap: true,
    target: 'es2022',
  },
]);
