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
    const { MCP_TOOL_PREFIX, MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } =
      await import('../../src/index.js');

    expect(MCP_TOOL_PREFIX).toBeDefined();
    expect(typeof MCP_TOOL_PREFIX).toBe('string');

    expect(MCP_SERVER_NAME).toBeDefined();
    expect(typeof MCP_SERVER_NAME).toBe('string');

    expect(TICKTICK_ESSENTIAL_TOOLS).toBeDefined();
    expect(Array.isArray(TICKTICK_ESSENTIAL_TOOLS)).toBe(true);
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

  it('должен экспортировать TOOL_CLASSES для валидации', async () => {
    const { TOOL_CLASSES } = await import('../../src/index.js');

    expect(TOOL_CLASSES).toBeDefined();
    expect(Array.isArray(TOOL_CLASSES)).toBe(true);
    expect(TOOL_CLASSES.length).toBeGreaterThan(0);

    // Проверяем что каждый класс имеет METADATA
    for (const ToolClass of TOOL_CLASSES) {
      expect(ToolClass.METADATA).toBeDefined();
      expect(ToolClass.METADATA.name).toBeDefined();
    }
  });

  it('должен экспортировать TickTickFacade', async () => {
    const { TickTickFacade } = await import('../../src/index.js');

    expect(TickTickFacade).toBeDefined();
    expect(typeof TickTickFacade).toBe('function'); // class
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
    const { ToolRegistry } = (await import('@fractalizer/mcp-core')) as any;

    const fakeConfig = {
      api: {
        baseUrl: 'https://api.ticktick.com/open/v1',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      },
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      tools: {
        discoveryMode: 'eager' as const,
        essentialTools: ['fr_ticktick_ping'],
        enabledCategories: undefined,
        disabledGroups: undefined,
      },
      logging: {
        level: 'error' as const,
        prettyLogs: false,
        dir: undefined,
      },
    };

    // Создание контейнера должно работать
    const container = await createContainer(fakeConfig);

    expect(container).toBeDefined();

    // Должны быть зарегистрированы базовые компоненты
    const toolRegistry = container.get(TYPES.ToolRegistry);
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
  });
});
