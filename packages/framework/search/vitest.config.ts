import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      // Package-specific настройки
      name: 'search',
    },
    resolve: {
      alias: {
        // Поддержка subpath imports
        '@mcp-framework/search': path.resolve(__dirname, './src'),
        '@mcp-framework/search/*': path.resolve(__dirname, './src/*'),
        '@mcp-framework/core': path.resolve(__dirname, '../core/src'),
        '@mcp-framework/core/*': path.resolve(__dirname, '../core/src/*'),
        '@mcp-framework/infrastructure': path.resolve(__dirname, '../infrastructure/src'),
        '@mcp-framework/infrastructure/*': path.resolve(__dirname, '../infrastructure/src/*'),
      },
    },
  })
);
