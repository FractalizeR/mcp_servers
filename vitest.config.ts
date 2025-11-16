import { defineConfig } from 'vitest/config';

/**
 * Корневая конфигурация Vitest для monorepo
 *
 * Тесты выполняются через workspace packages:
 * - packages/infrastructure/tests/
 * - packages/core/tests/
 * - packages/search/tests/
 * - packages/yandex-tracker/tests/
 *
 * Каждый пакет имеет свой vitest.config.ts
 */
export default defineConfig({
  test: {
    // Базовые настройки для monorepo
    globals: true,
    environment: 'node',

    // Исключаем тесты из корня (их больше нет)
    // Тесты запускаются через workspaces
    include: [],
    exclude: ['**/node_modules/**', '**/dist/**', '**/packages/**'],
  },
});
