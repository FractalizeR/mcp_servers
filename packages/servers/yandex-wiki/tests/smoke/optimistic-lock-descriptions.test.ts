/**
 * Контрактный тест подсказки об оптимистичной блокировке.
 *
 * Защищает от регрессии, которую ручная проверка не ловит: параметр `version`
 * легко завести новым инструментом и оставить без описания — ровно так три
 * инструмента трекера из пяти и прожили с блокировкой, о которой вызывающий не
 * знал, а все восемь grid-инструментов Вики — с описанием «Ревизия таблицы»,
 * не объясняющим ни смысла, ни цены пропуска.
 *
 * Тест идёт от СГЕНЕРИРОВАННОГО definition, а не от Zod-схемы: проверяется то,
 * что реально уезжает клиенту.
 */

import { describe, it, expect, vi } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import type { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

const mockFacade = {} as YandexWikiFacade;
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as Logger;

/** Токен блокировки таблиц Вики; `revision_id` у чтения страниц — выбор ревизии, не токен. */
const LOCK_PARAM = 'revision';

describe('Подсказка об оптимистичной блокировке', () => {
  const withLockParam = TOOL_CLASSES.map((ToolClass) => {
    const definition = new ToolClass(mockFacade, mockLogger).getDefinition();
    const properties = (definition.inputSchema.properties ?? {}) as Record<
      string,
      { description?: string }
    >;
    return { name: definition.name, param: properties[LOCK_PARAM] };
  }).filter((entry) => entry.param !== undefined);

  it('множество инструментов с токеном блокировки не изменилось молча', () => {
    // Не `> 0`: новый инструмент записи с токеном обязан попасть под проверку
    // осознанно, а исчезнувший — быть замечен. Число правится вместе с составом.
    expect(withLockParam.map((entry) => entry.name).sort()).toHaveLength(8);
  });

  for (const { name, param } of withLockParam) {
    it(`${name}: описание revision названо и несёт риск конфликта`, () => {
      expect(param?.description, `${name}: параметр revision без описания`).toBeDefined();
      expect(param?.description).toContain('Токен оптимистичной блокировки');
    });
  }
});
