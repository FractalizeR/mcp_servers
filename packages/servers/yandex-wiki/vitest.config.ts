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
        '@mcp-framework/cli': path.resolve(__dirname, '../../framework/cli/src'),
        '@mcp-framework/cli/*': path.resolve(__dirname, '../../framework/cli/src/*'),
      },
    },
  })
);
