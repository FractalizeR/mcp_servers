/**
 * Тесты для ToolAccessPolicy — единый источник истины о доступности инструмента
 *
 * Контекст (пакет 1.1.A плана модернизации, .agentic-planning/plan_mcp_2026_modernization/
 * 1.1_defects_sequential.md): `tools/list` фильтрует набор инструментов через
 * disabledToolGroups, а `ToolRegistry.execute()` раньше доставал tool из полной карты
 * БЕЗ проверки — скрытый/отключённый через конфигурацию tool можно было вызвать напрямую,
 * зная его имя. Эти тесты фиксируют, что оба пути (tools/list через getDefinitions()
 * и tools/call через execute) дают согласованный вердикт.
 *
 * Расширено в пакете 2.1.B плана модернизации (удаление lazy discovery): позитивный
 * фильтр (enabledToolCategories) и режимы discovery убраны, DISABLED_TOOL_GROUPS —
 * единственный рубильник.
 *
 * Расширено в пакете 4.1.B (общий adapter): normalizeToolName переехал в
 * @fractalizer/mcp-core (mcp-server-adapter) вместе с остальной протокольной
 * логикой, тесты обновлены на новый импорт и getVisibleDefinitions().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Container } from 'inversify';
import type { ServerConfig } from '#config';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import { MCP_SERVER_NAME } from '#constants';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { normalizeToolName } from '@fractalizer/mcp-core';

/**
 * Категория 'issues' полностью отключена через disabledToolGroups —
 * тот же механизм, что реально используется в проде для сужения набора
 * инструментов (ENV: DISABLED_TOOL_GROUPS).
 */
const DISABLED_TOOL_NAME = 'fr_yandex_tracker_get_issues';

function buildConfig(): ServerConfig {
  return {
    token: 'test-token',
    orgId: 'test-org',
    apiBase: 'https://api.tracker.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'info',
    logsDir: '/tmp/logs',
    logMaxSize: 10485760,
    logMaxFiles: 10,
    prettyLogs: false,
    disabledToolGroups: {
      includeAll: false,
      categories: new Set(['issues']),
      categoriesWithSubcategories: new Map(),
    },
  };
}

describe('ToolAccessPolicy — граница доступа между tools/list и tools/call', () => {
  let container: Container;
  let registry: ToolRegistry;
  let logger: Logger;
  let config: ServerConfig;

  beforeEach(async () => {
    config = buildConfig();
    container = await createContainer(config);
    registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    logger = container.get<Logger>(TYPES.Logger);
  });

  it('disabled tool отсутствует в tools/list (getVisibleDefinitions — путь adapter/server.ts)', () => {
    const definitions = registry.getVisibleDefinitions();

    expect(definitions.find((d) => d.name === DISABLED_TOOL_NAME)).toBeUndefined();
  });

  it('DoD 2.1.B: отключённая группа не вызывается напрямую (расширение теста этапа 1)', async () => {
    // Отдельно от DoD 1.1.A#1 ниже — явная проверка требования этапа 2.1.B: рубильник
    // DISABLED_TOOL_GROUPS не только скрывает инструмент из tools/list, но и запрещает
    // его прямой вызов через tools/call (единая ToolAccessPolicy для обеих точек).
    const result = await registry.execute(DISABLED_TOOL_NAME, {});

    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
    expect(text).toContain('недоступен в текущей конфигурации сервера');
  });

  it('DoD 1.1.A#1: прямой tools/call для tool, отсутствующего в tools/list, получает отказ', async () => {
    // Пустые params: если бы запрос дошёл до самого tool, он бы упал на Zod-валидации
    // (issueKeys/fields обязательны) — с ДРУГИМ текстом ошибки. Проверяем именно текст
    // отказа ПОЛИТИКИ, чтобы отличить "заблокировано ДО исполнения" от "провалена
    // валидация ВНУТРИ исполнения" (последнее было бы false positive для этого теста).
    const result = await registry.execute(DISABLED_TOOL_NAME, {});

    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
    expect(text).toContain('недоступен в текущей конфигурации сервера');

    // Не должно быть веткой "не найден" (это другая ветка — fuzzy-подсказка неуместна
    // для существующего, но запрещённого инструмента)
    expect(text).not.toContain('не найден');
    expect(text).not.toContain('availableTools');
    expect(text).not.toContain('similarTools');
  });

  it('DoD 1.1.A#2: имя с префиксом сервера и без него дают одинаковый вердикт policy', async () => {
    const prefixedName = `${MCP_SERVER_NAME}:${DISABLED_TOOL_NAME}`;
    const serverPrefixes = [`${MCP_SERVER_NAME}:`];

    // Нормализация — до проверки policy (как в adapter'е: normalizeToolName вызывается
    // перед toolRegistry.execute)
    const { name: normalizedFromPrefixed } = normalizeToolName(
      prefixedName,
      serverPrefixes,
      logger
    );
    const { name: normalizedFromBare } = normalizeToolName(
      DISABLED_TOOL_NAME,
      serverPrefixes,
      logger
    );

    expect(normalizedFromPrefixed).toBe(DISABLED_TOOL_NAME);
    expect(normalizedFromBare).toBe(DISABLED_TOOL_NAME);

    const resultViaPrefix = await registry.execute(normalizedFromPrefixed, {});
    const resultDirect = await registry.execute(normalizedFromBare, {});

    expect(resultViaPrefix.isError).toBe(true);
    expect(resultDirect.isError).toBe(true);
    expect(resultViaPrefix.content).toEqual(resultDirect.content);
  });

  it('DoD 1.1.A#3: текст отказа не раскрывает имена других инструментов', async () => {
    const result = await registry.execute(DISABLED_TOOL_NAME, {});
    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';

    const otherToolNames = registry
      .getAllTools()
      .map((tool) => tool.getDefinition().name)
      .filter((name) => name !== DISABLED_TOOL_NAME);

    expect(otherToolNames.length).toBeGreaterThan(0);
    for (const otherName of otherToolNames) {
      expect(text).not.toContain(otherName);
    }
  });

  it('tool вне отключённой категории остаётся видимым в tools/list', () => {
    const definitions = registry.getVisibleDefinitions();

    expect(definitions.find((d) => d.name === 'fr_yandex_tracker_ping')).toBeDefined();
  });
});
