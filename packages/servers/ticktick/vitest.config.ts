import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [
      tsconfigPaths({
        projects: ['./tsconfig.tests.json'],
      }),
    ],
    // Set environment variables before module loading
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
      'process.env.VITEST': JSON.stringify('true'),
    },
    test: {
      // Package-specific settings
      name: 'ticktick',
      // Performance monitoring: warn about tests slower than 300ms
      slowTestThreshold: 300,
      exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache,output,temp}/**'],
      // Setup file to load reflect-metadata before any tests
      setupFiles: ['./tests/setup.ts'],
    },
    resolve: {
      alias: {
        // Framework packages (inter-package dependencies for vitest)
        '@fractalizer/mcp-search': path.resolve(__dirname, '../../framework/search/src'),
        '@fractalizer/mcp-search/*': path.resolve(__dirname, '../../framework/search/src/*'),
        '@fractalizer/mcp-core': path.resolve(__dirname, '../../framework/core/src'),
        '@fractalizer/mcp-core/*': path.resolve(__dirname, '../../framework/core/src/*'),
        '@fractalizer/mcp-infrastructure': path.resolve(
          __dirname,
          '../../framework/infrastructure/src'
        ),
        '@fractalizer/mcp-infrastructure/*': path.resolve(
          __dirname,
          '../../framework/infrastructure/src/*'
        ),
      },
    },
  })
);
