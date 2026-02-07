import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node16',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
