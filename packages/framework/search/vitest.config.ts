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
        '@fractalizer/mcp-search': path.resolve(__dirname, './src'),
        '@fractalizer/mcp-search/*': path.resolve(__dirname, './src/*'),
        '@fractalizer/mcp-core': path.resolve(__dirname, '../core/src'),
        '@fractalizer/mcp-core/*': path.resolve(__dirname, '../core/src/*'),
        '@fractalizer/mcp-infrastructure': path.resolve(__dirname, '../infrastructure/src'),
        '@fractalizer/mcp-infrastructure/*': path.resolve(__dirname, '../infrastructure/src/*'),
      },
    },
  })
);
