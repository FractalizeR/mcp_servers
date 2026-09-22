/**
 * Контрактный тест подсказки об оптимистичной блокировке.
 *
 * Защищает от регрессии, которую ручная проверка не ловит: параметр `version`
 * легко завести новым инструментом и оставить без описания — ровно так три
 * инструмента из пяти и прожили с блокировкой, о которой вызывающий не знал
 * (объяснение висело в JSDoc, которого на wire нет).
 *
 * Тест идёт от СГЕНЕРИРОВАННОГО definition, а не от Zod-схемы: проверяется то,
 * что реально уезжает клиенту.
 */

import { describe, it, expect, vi } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { Logger } from '@fractalizer/mcp-infrastructure';

const mockFacade = {} as YandexTrackerFacade;
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as Logger;

/** Токен блокировки живёт под этим именем; `versions` — поле задачи «Версии», не токен. */
const LOCK_PARAM = 'version';

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
    expect(withLockParam.map((entry) => entry.name).sort()).toHaveLength(5);
  });

  for (const { name, param } of withLockParam) {
    it(`${name}: описание version названо и несёт риск конфликта`, () => {
      expect(param?.description, `${name}: параметр version без описания`).toBeDefined();
      expect(param?.description).toContain('Токен оптимистичной блокировки');
    });
  }
});
