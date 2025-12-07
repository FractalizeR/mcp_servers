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
    test: {
      // Package-specific settings
      name: 'ticktick',
      // Performance monitoring: warn about tests slower than 300ms
      slowTestThreshold: 300,
      exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache,output,temp}/**'],
    },
    resolve: {
      alias: {
        // Framework packages (inter-package dependencies for vitest)
        '@mcp-framework/search': path.resolve(__dirname, '../../framework/search/src'),
        '@mcp-framework/search/*': path.resolve(__dirname, '../../framework/search/src/*'),
        '@mcp-framework/core': path.resolve(__dirname, '../../framework/core/src'),
        '@mcp-framework/core/*': path.resolve(__dirname, '../../framework/core/src/*'),
        '@mcp-framework/infrastructure': path.resolve(
          __dirname,
          '../../framework/infrastructure/src'
        ),
        '@mcp-framework/infrastructure/*': path.resolve(
          __dirname,
          '../../framework/infrastructure/src/*'
        ),
      },
    },
  })
);
