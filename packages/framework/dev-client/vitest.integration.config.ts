import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedConfig } from '../../../vitest.shared';

/**
 * Отдельная конфигурация для `npm run test:integration` (DoD 8 пакета 1.1).
 *
 * Намеренно не расширяет `vitest.config.ts` (тот исключает `tests/integration/**`
 * из обычного прогона) — берёт `sharedConfig` напрямую и сужает `include` только
 * до интеграционных тестов. Не участвует в `validate`/`validate:quiet`: эти
 * тесты требуют реального `claude` CLI и подключённой записи сервера, чего
 * релизный CI не гарантирует (см. `tests/integration/dev-session.integration.test.ts`).
 */
export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      name: 'dev-client:integration',
      // `mergeConfig` конкатенирует массивы (не заменяет) — переопределение
      // `include` здесь ничего не даст, унаследованный из `sharedConfig`
      // `tests/**/*.test.ts` всё равно останется в объединённом списке.
      // Поэтому сужаем через `exclude`: убираем юнит-тесты, оставляя только
      // `tests/integration/**`.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{git,cache,output,temp}/**',
        'tests/unit/**',
        // И `tests/cli/**` — это тоже юнит-тесты (сессия подменена фейковым
        // транспортом). Без этой строки `npm run test:integration` повторно
        // гонял их вопреки собственному комментарию выше.
        'tests/cli/**',
      ],
      // Реальный MCP handshake + сетевой вызов — заметно дольше юнит-тестов.
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
    resolve: {
      alias: {
        '@fractalizer/mcp-dev-client': path.resolve(__dirname, './src'),
        '@fractalizer/mcp-dev-client/*': path.resolve(__dirname, './src/*'),
      },
    },
  })
);
