#!/usr/bin/env tsx
/**
 * Smoke-тест собранного бандла Yandex Wiki.
 *
 * Сценарии и их порядок — в общем харнессе
 * (`packages/servers/scripts/mcp-wire-harness/smoke-test.ts`); здесь только
 * то, чем этот сервер отличается от двух других: бандл, переменные окружения,
 * ожидания по списку инструментов и строки отчёта.
 */

import { runSmokeTest } from '../../scripts/mcp-wire-harness/index.js';

await runSmokeTest({
  label: 'Yandex Wiki',
  bundlePath: 'dist/yandex-wiki.bundle.cjs',
  baseEnv: {
    YANDEX_WIKI_TOKEN: 'OAuth dummy-token-for-smoke-test',
    YANDEX_ORG_ID: '123456',
  },
  deprecatedEnvVar: { name: 'TOOL_DISCOVERY_MODE', value: 'eager' },
  minExpectedTools: 5,
  requiredTools: ['yw_ping'],
  forbiddenTools: ['search_tools', 'yw_search_tools'],
  messages: {
    header: '🚀 Запуск smoke-теста MCP сервера...\n',
    startingServer: '1️⃣  Запуск сервера: node dist/yandex-wiki.bundle.cjs',
    sendingRequest: '\n2️⃣  Отправка JSON-RPC запроса: tools/list',
    awaitingResponse: '   Запрос отправлен, ожидание ответа...',
    validating: '\n3️⃣  Валидация ответа',
    responseValid: '   ✓ Ответ валиден',
    toolsFound: (count: number) => `   ✓ Найдено ${count} инструментов`,
    determinism: '\n4️⃣  Проверка детерминированности порядка (второй tools/list)',
    listIdentical: '   ✓ Список побайтово идентичен',
    deprecatedEnvVar: '\n5️⃣  Проверка предупреждения о TOOL_DISCOVERY_MODE (устаревшая переменная)',
    warningPresent: '   ✓ Предупреждение в stderr есть, сервер не упал',
    stillWorking: (count: number) => `   ✓ tools/list продолжает работать (${count} инструментов)`,
    passed: '\n✅ Smoke-тест успешно пройден!',
    failed: '\n❌ Smoke-тест провален:',
    stoppingServer: '\n🛑 Останавливаем сервер...',
  },
});
