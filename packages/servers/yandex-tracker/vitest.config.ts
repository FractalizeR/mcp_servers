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
      // Smoke-тесты импортируют весь сервер (DI + ~50 инструментов) — в CI на
      // холодном кеше первый импорт может превысить дефолтные 10s (см. падение
      // entry-point.smoke.test.ts «loadConfig timed out in 10000ms»). Поднимаем
      // потолок, не трогая быстрые тесты.
      testTimeout: 30000,
      // Исключить legacy тесты (сохранены для rollback, но не запускаются)
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{git,cache,output,temp}/**',
        'tests/cli-legacy/**',
      ],
    },
    resolve: {
      alias: {
        // Framework packages (междупакетные зависимости для vitest)
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
