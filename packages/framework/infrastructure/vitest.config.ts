import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      // Package-specific настройки
      name: 'infrastructure',
    },
    resolve: {
      alias: {
        '@mcp-framework/infrastructure': path.resolve(__dirname, './src'),
      },
    },
  })
);
