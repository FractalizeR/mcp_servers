/**
 * Smoke-тесты пакета 3.1.C.tracker (annotations + outputSchema + tools/list).
 *
 * Обходит РЕЕСТР инструментов (`TOOL_CLASSES` — тот же массив, из которого
 * строится `ToolRegistry` в composition-root), а не сверяется со списком,
 * зашитым в тест. Так тест ловит забытый инструмент при добавлении нового.
 *
 * DoD пакета 3.1.C.tracker:
 * 1. Все инструменты имеют annotations и outputSchema (число инструментов
 *    выросло с 50 до 86 пакетом 7.2.A/7.2.B, затем до 91 пакетом 7.2.E —
 *    глобальные поля Трекера, см. .agentic-planning/
 *    plan_mcp_2026_modernization/7.2_api_coverage_parallel.md; затем до 92
 *    пакетом 6.1 — analyze_issue_description, пилот MCP Apps №1).
 * 2. tools/list (`projectToolDefinitionsForList`) отдаёт title, outputSchema,
 *    annotations.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { projectToolDefinitionsForList } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';

describe('Пакет 3.1.C.tracker — annotations/outputSchema/tools-list contract', () => {
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let definitions: ToolDefinition[];

  beforeAll(() => {
    mockFacade = {} as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    // Обход РЕЕСТРА: тот же TOOL_CLASSES, что передаётся в ToolRegistry
    // в composition-root (см. src/composition-root/definitions/tool-definitions.ts).
    definitions = TOOL_CLASSES.map((ToolClass) => {
      const tool = new ToolClass(mockFacade, mockLogger);
      return tool.getDefinition();
    });
  });

  it('реестр содержит ровно 90 инструментов (перечисление зафиксировано планом этапа)', () => {
    expect(TOOL_CLASSES.length).toBe(90);
    expect(definitions.length).toBe(90);
  });

  describe('DoD 1: каждый инструмент реестра имеет annotations и outputSchema', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} имеет annotations и outputSchema`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        expect(definition.outputSchema, `${ToolClass.name}.outputSchema`).toBeDefined();
        expect(definition.outputSchema?.type).toBe('object');

        expect(definition.annotations, `${ToolClass.name}.annotations`).toBeDefined();
        // Все четыре хинта должны быть явно выставлены (не оставлены undefined) —
        // "не read-only не значит destructive" и "update не значит idempotent"
        // (см. план 3.1.C) требуют осознанного выбора для каждого хинта.
        expect(typeof definition.annotations?.readOnlyHint).toBe('boolean');
        expect(typeof definition.annotations?.destructiveHint).toBe('boolean');
        expect(typeof definition.annotations?.idempotentHint).toBe('boolean');
        expect(typeof definition.annotations?.openWorldHint).toBe('boolean');
      });
    });

    it('агрегированная проверка по всему реестру (одна точка отказа при регрессии)', () => {
      const missing = definitions
        .map((d, i) => ({ name: TOOL_CLASSES[i]?.name, d }))
        .filter(({ d }) => !d.outputSchema || !d.annotations)
        .map(({ name }) => name);

      expect(missing).toEqual([]);
    });
  });

  describe('DoD 3: tools/list отдаёт title, outputSchema, annotations', () => {
    it('projectToolDefinitionsForList прокидывает все три поля для каждого инструмента', () => {
      const listEntries = projectToolDefinitionsForList(definitions);

      expect(listEntries.length).toBe(90);

      const missingTitle = listEntries.filter((e) => !e.title).map((e) => e.name);
      const missingOutputSchema = listEntries.filter((e) => !e.outputSchema).map((e) => e.name);
      const missingAnnotations = listEntries.filter((e) => !e.annotations).map((e) => e.name);

      expect(missingTitle, 'инструменты без title').toEqual([]);
      expect(missingOutputSchema, 'инструменты без outputSchema').toEqual([]);
      expect(missingAnnotations, 'инструменты без annotations').toEqual([]);
    });

    it('title отличается от name (человекочитаемое имя, а не дубль машинного)', () => {
      const listEntries = projectToolDefinitionsForList(definitions);
      const identical = listEntries.filter((e) => e.title === e.name).map((e) => e.name);
      expect(identical, 'title совпадает с name').toEqual([]);
    });

    it('outputSchema каждого инструмента — валидный JSON Schema object-контейнер', () => {
      const listEntries = projectToolDefinitionsForList(definitions);
      listEntries.forEach((entry) => {
        expect(entry.outputSchema?.type, entry.name).toBe('object');
        expect(entry.outputSchema?.properties, entry.name).toBeDefined();
        // envelope { success, data } — оба поля обязательны
        expect(entry.outputSchema?.required, entry.name).toEqual(
          expect.arrayContaining(['success', 'data'])
        );
      });
    });
  });
});
