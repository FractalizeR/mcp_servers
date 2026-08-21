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
 *
 * Импорт статический, а не `await import()` внутри тестов. Он тянет весь граф
 * модулей сервера (DI + все инструменты), и под полной параллельной нагрузкой
 * монорепо это десятки секунд. На этапе сбора файла такая стоимость ничем не
 * ограничена, а внутри тела теста она попадает под testTimeout — так первые
 * тесты этого файла и падали по лимиту, пока остальные smoke-файлы с тем же
 * графом и статическими импортами проходили.
 */

import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '@fractalizer/mcp-core';
import * as entryPoint from '../../src/index.js';

const {
  loadConfig,
  MCP_TOOL_PREFIX,
  MCP_SERVER_NAME,
  createContainer,
  TYPES,
  TOOL_CLASSES,
  OPERATION_CLASSES,
  YandexTrackerFacade,
} = entryPoint;

describe('Entry Point Exports (Smoke)', () => {
  it('должен экспортировать loadConfig', () => {
    expect(loadConfig).toBeDefined();
    expect(typeof loadConfig).toBe('function');
  });

  it('должен экспортировать константы', () => {
    expect(MCP_TOOL_PREFIX).toBeDefined();
    expect(typeof MCP_TOOL_PREFIX).toBe('string');

    expect(MCP_SERVER_NAME).toBeDefined();
    expect(typeof MCP_SERVER_NAME).toBe('string');
  });

  it('должен экспортировать DI компоненты', () => {
    expect(createContainer).toBeDefined();
    expect(typeof createContainer).toBe('function');

    expect(TYPES).toBeDefined();
    expect(typeof TYPES).toBe('object');
    expect(TYPES.Logger).toBeDefined();
    expect(TYPES.HttpClient).toBeDefined();
    expect(TYPES.ToolRegistry).toBeDefined();
  });

  it('должен экспортировать TOOL_CLASSES для валидации', () => {
    expect(TOOL_CLASSES).toBeDefined();
    expect(Array.isArray(TOOL_CLASSES)).toBe(true);
    expect(TOOL_CLASSES.length).toBeGreaterThan(0);

    // Проверяем что каждый класс имеет METADATA
    for (const ToolClass of TOOL_CLASSES) {
      expect(ToolClass.METADATA).toBeDefined();
      expect(ToolClass.METADATA.name).toBeDefined();
    }
  });

  it('должен экспортировать OPERATION_CLASSES для валидации', () => {
    expect(OPERATION_CLASSES).toBeDefined();
    expect(Array.isArray(OPERATION_CLASSES)).toBe(true);
    expect(OPERATION_CLASSES.length).toBeGreaterThan(0);
  });

  it('должен экспортировать YandexTrackerFacade', () => {
    expect(YandexTrackerFacade).toBeDefined();
    expect(typeof YandexTrackerFacade).toBe('function'); // class
  });

  it('не должен запускать сервер при импорте', () => {
    // Если бы index.ts дёргал main(), сервер повис бы на server.connect() ещё
    // при сборе этого файла и до проверок дело бы не дошло. Здесь фиксируется
    // вторая половина правила: bootstrap наружу не торчит.
    expect(entryPoint).not.toHaveProperty('main');
    expect(entryPoint).not.toHaveProperty('startServer');
  });

  it('должен работать с createContainer без реального API', async () => {
    const fakeConfig = {
      token: 'test-token',
      orgId: 'test-org',
      apiBase: 'https://api.tracker.yandex.net',
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      logLevel: 'error' as const,
      prettyLogs: false,
      logsDir: '/tmp/logs',
      logMaxSize: 10485760,
      logMaxFiles: 10,
    };

    // Создание контейнера должно работать
    const container = await createContainer(fakeConfig);

    expect(container).toBeDefined();

    // Должны быть зарегистрированы базовые компоненты
    const toolRegistry = container.get(TYPES.ToolRegistry);
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
  });
});
