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
      // Performance monitoring: warn about tests slower than 300ms
      slowTestThreshold: 300,
      // Исключить legacy тесты (сохранены для rollback, но не запускаются)
      exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache,output,temp}/**', 'tests/cli-legacy/**'],
    },
    resolve: {
      alias: {
        // Framework packages (междупакетные зависимости для vitest)
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
