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
import { createServerConfigFixture } from '#helpers/index.js';
import * as entryPoint from '../../src/index.js';

const {
  loadConfig,
  MCP_TOOL_PREFIX,
  YANDEX_WIKI_API_BASE,
  createContainer,
  TYPES,
  GetPageTool,
  GetPageByIdTool,
  CreatePageTool,
  UpdatePageTool,
  DeletePageTool,
  ClonePageTool,
  AppendContentTool,
  PingTool,
  YandexWikiFacade,
  PageService,
} = entryPoint;

describe('Entry Point Exports (Smoke)', () => {
  it('должен экспортировать loadConfig', () => {
    expect(loadConfig).toBeDefined();
    expect(typeof loadConfig).toBe('function');
  });

  it('должен экспортировать константы', () => {
    expect(MCP_TOOL_PREFIX).toBeDefined();
    expect(typeof MCP_TOOL_PREFIX).toBe('string');

    expect(YANDEX_WIKI_API_BASE).toBeDefined();
    expect(typeof YANDEX_WIKI_API_BASE).toBe('string');
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

  it('должен экспортировать Tool классы', () => {
    expect(GetPageTool).toBeDefined();
    expect(GetPageByIdTool).toBeDefined();
    expect(CreatePageTool).toBeDefined();
    expect(UpdatePageTool).toBeDefined();
    expect(DeletePageTool).toBeDefined();
    expect(ClonePageTool).toBeDefined();
    expect(AppendContentTool).toBeDefined();
    expect(PingTool).toBeDefined();
  });

  it('должен экспортировать YandexWikiFacade', () => {
    expect(YandexWikiFacade).toBeDefined();
    expect(typeof YandexWikiFacade).toBe('function'); // class
  });

  it('должен экспортировать PageService', () => {
    expect(PageService).toBeDefined();
    expect(typeof PageService).toBe('function'); // class
  });

  it('не должен запускать сервер при импорте', () => {
    // Если бы index.ts дёргал main(), сервер повис бы на server.connect() ещё
    // при сборе этого файла и до проверок дело бы не дошло. Здесь фиксируется
    // вторая половина правила: bootstrap наружу не торчит.
    expect(entryPoint).not.toHaveProperty('main');
    expect(entryPoint).not.toHaveProperty('startServer');
  });

  it('должен работать с createContainer без реального API', async () => {
    const fakeConfig = createServerConfigFixture({
      token: 'test-token',
      orgId: 'test-org',
      apiBase: 'https://api.wiki.yandex.net/v1',
    });

    // Создание контейнера должно работать
    const container = await createContainer(fakeConfig);

    expect(container).toBeDefined();

    // Должны быть зарегистрированы базовые компоненты
    const toolRegistry = container.get(TYPES.ToolRegistry);
    expect(toolRegistry).toBeInstanceOf(ToolRegistry);
  });
});
