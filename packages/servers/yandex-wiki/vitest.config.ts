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
      name: 'yandex-wiki',
      slowTestThreshold: 300,
      exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache,output,temp}/**'],
    },
    resolve: {
      alias: {
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
        '@fractalizer/mcp-cli': path.resolve(__dirname, '../../framework/cli/src'),
        '@fractalizer/mcp-cli/*': path.resolve(__dirname, '../../framework/cli/src/*'),
      },
    },
  })
);
