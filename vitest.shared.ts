import type { UserConfig } from 'vitest/config';

/**
 * Shared Vitest Configuration
 *
 * Общая конфигурация для всех пакетов в monorepo.
 * Каждый пакет может расширить эту конфигурацию через свой vitest.config.ts
 */
export const sharedConfig: UserConfig = {
  test: {
    globals: true,
    environment: 'node',

    // Общие настройки для всех пакетов
    testTimeout: 10000,
    hookTimeout: 10000,

    // Стандартные include/exclude
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache,output,temp}/**'],

    // Coverage настройки (применяются на корневом уровне)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
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
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
};
