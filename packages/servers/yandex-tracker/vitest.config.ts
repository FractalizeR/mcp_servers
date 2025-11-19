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
      // Package-specific настройки
      name: 'yandex-tracker',
    },
    resolve: {
      alias: {
        // Поддержка subpath imports для локального пакета
        'mcp-server-yandex-tracker': path.resolve(__dirname, './src'),
        'mcp-server-yandex-tracker/*': path.resolve(__dirname, './src/*'),

        // Path aliases для локальных модулей (с wildcard для subpaths)
        '@tracker_api': path.resolve(__dirname, './src/tracker_api'),
        '@tracker_api/*': path.resolve(__dirname, './src/tracker_api/*'),
        '@tools': path.resolve(__dirname, './src/tools'),
        '@tools/*': path.resolve(__dirname, './src/tools/*'),
        '@composition-root': path.resolve(__dirname, './src/composition-root'),
        '@composition-root/*': path.resolve(__dirname, './src/composition-root/*'),
        '@cli': path.resolve(__dirname, './src/cli'),
        '@cli/*': path.resolve(__dirname, './src/cli/*'),
        '@constants': path.resolve(__dirname, './src/constants'),

        // Test helpers
        '@integration': path.resolve(__dirname, './tests/integration'),
        '@integration/*': path.resolve(__dirname, './tests/integration/*'),

        // Framework packages (с wildcard для subpaths)
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
