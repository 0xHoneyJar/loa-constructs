import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/client.ts', 'src/auth.ts', 'src/cache.ts', 'src/types.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
  },
  {
    entry: ['bin/constructs.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    // Source file already has shebang comment which tsup preserves
  },
]);
