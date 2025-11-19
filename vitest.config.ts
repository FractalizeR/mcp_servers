import { defineConfig } from 'vitest/config';

/**
 * Корневая конфигурация Vitest для monorepo
 *
 * При использовании workspace (vitest.workspace.ts), эта конфигурация
 * влияет только на глобальные опции (reporters, coverage).
 *
 * Тесты выполняются через workspace packages.
 */
export default defineConfig({
  test: {
    // Coverage агрегируется здесь
    coverage: {
      // Включаем все packages в coverage
      include: ['packages/**/src/**/*.ts'],

      // Providers и reporters
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],

      // Exclude patterns
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        '**/*.config.{ts,js,mjs}',
        '**/tests/**',
        '**/scripts/**',
      ],

      // Пороги покрытия
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        autoUpdate: false,
        perFile: false,
      },
    },
  },
});
