import { defineWorkspace } from 'vitest/config';

/**
 * Vitest Workspace Configuration для Monorepo
 *
 * Определяет все пакеты как отдельные проекты для тестирования.
 * Coverage агрегируется на корневом уровне.
 *
 * @see https://vitest.dev/guide/workspace
 */
export default defineWorkspace([
  // Framework packages
  'packages/framework/infrastructure',
  'packages/framework/core',
  'packages/framework/search',

  // Server packages
  'packages/servers/yandex-tracker',
]);
