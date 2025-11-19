import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      // Package-specific настройки
      name: 'yandex-tracker',
    },
    resolve: {
      alias: {
        'mcp-server-yandex-tracker': path.resolve(__dirname, './src'),
        '@tracker_api': path.resolve(__dirname, './src/tracker_api'),
        '@tools': path.resolve(__dirname, './src/tools'),
        '@composition-root': path.resolve(__dirname, './src/composition-root'),
        '@cli': path.resolve(__dirname, './src/cli'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@integration': path.resolve(__dirname, './tests/integration'),
        '@mcp-framework/search': path.resolve(__dirname, '../../framework/search/src'),
        '@mcp-framework/core': path.resolve(__dirname, '../../framework/core/src'),
        '@mcp-framework/infrastructure': path.resolve(
          __dirname,
          '../../framework/infrastructure/src'
        ),
      },
    },
  })
);
