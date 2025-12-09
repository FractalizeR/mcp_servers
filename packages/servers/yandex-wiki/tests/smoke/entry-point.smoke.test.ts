/**
 * Smoke Test: Entry Point Exports
 *
 * Проверяет что index.ts (точка входа для библиотеки):
 * 1. Экспортирует все необходимые компоненты
 * 2. Не запускает сервер при импорте
 * 3. Может быть использован как библиотека
 *
 * ВАЖНО: Этот тест импортирует index.ts напрямую, что позволяет
 * обнаружить проблемы с экспортами до того, как пользователь
 * столкнётся с ними в production.
 */

import { describe, it, expect } from 'vitest';

describe('Entry Point Exports (Smoke)', () => {
  it('должен экспортировать loadConfig', async () => {
    const { loadConfig } = await import('../../src/index.js');
    expect(loadConfig).toBeDefined();
    expect(typeof loadConfig).toBe('function');
  });

  it('должен экспортировать константы', async () => {
    const { MCP_TOOL_PREFIX, YANDEX_WIKI_API_BASE } = await import('../../src/index.js');

    expect(MCP_TOOL_PREFIX).toBeDefined();
    expect(typeof MCP_TOOL_PREFIX).toBe('string');

    expect(YANDEX_WIKI_API_BASE).toBeDefined();
    expect(typeof YANDEX_WIKI_API_BASE).toBe('string');
  });

  it('должен экспортировать DI компоненты', async () => {
    const { createContainer, TYPES } = await import('../../src/index.js');

    expect(createContainer).toBeDefined();
    expect(typeof createContainer).toBe('function');

    expect(TYPES).toBeDefined();
    expect(typeof TYPES).toBe('object');
    expect(TYPES.Logger).toBeDefined();
    expect(TYPES.HttpClient).toBeDefined();
    expect(TYPES.ToolRegistry).toBeDefined();
  });

  it('должен экспортировать Tool классы', async () => {
    const {
      GetPageTool,
      GetPageByIdTool,
      CreatePageTool,
      UpdatePageTool,
      DeletePageTool,
      ClonePageTool,
      AppendContentTool,
      PingTool,
    } = await import('../../src/index.js');

    expect(GetPageTool).toBeDefined();
    expect(GetPageByIdTool).toBeDefined();
    expect(CreatePageTool).toBeDefined();
    expect(UpdatePageTool).toBeDefined();
    expect(DeletePageTool).toBeDefined();
    expect(ClonePageTool).toBeDefined();
    expect(AppendContentTool).toBeDefined();
    expect(PingTool).toBeDefined();
  });

  it('должен экспортировать YandexWikiFacade', async () => {
    const { YandexWikiFacade } = await import('../../src/index.js');

    expect(YandexWikiFacade).toBeDefined();
    expect(typeof YandexWikiFacade).toBe('function'); // class
  });

  it('должен экспортировать PageService', async () => {
    const { PageService } = await import('../../src/index.js');

    expect(PageService).toBeDefined();
    expect(typeof PageService).toBe('function'); // class
  });

  it('не должен запускать сервер при импорте', async () => {
    // Если index.ts содержит вызов main(), этот тест упадёт
    // потому что сервер попытается подключиться к stdio
    const startTime = Date.now();

    // Импорт не должен блокировать выполнение
    await import('../../src/index.js');

    const elapsed = Date.now() - startTime;

    // Импорт должен быть быстрым (< 5 секунд)
    // Если бы сервер запустился, он бы завис на server.connect()
    expect(elapsed).toBeLessThan(5000);
  });

  it('должен работать с createContainer без реального API', async () => {
    const { createContainer, TYPES } = await import('../../src/index.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { ToolRegistry } = (await import('@mcp-framework/core')) as any;

    const fakeConfig = {
      token: 'test-token',
      orgId: 'test-org',
      cloudOrgId: undefined,
      apiBase: 'https://api.wiki.yandex.net/v1',
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      logLevel: 'error' as const,
      prettyLogs: false,
      toolDiscoveryMode: 'eager' as const,
      essentialTools: ['yw_ping'],
    };

    // Создание контейнера должно работать
    const container = await createContainer(fakeConfig);

    expect(container).toBeDefined();

    // Должны быть зарегистрированы базовые компоненты
    const toolRegistry = container.get(TYPES.ToolRegistry);
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
  });
});
