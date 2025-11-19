import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      // Package-specific настройки
      name: 'core',
    },
    resolve: {
      alias: {
        '@mcp-framework/core': path.resolve(__dirname, './src'),
        '@mcp-framework/infrastructure': path.resolve(__dirname, '../infrastructure/src'),
      },
    },
  })
);
