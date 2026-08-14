/**
 * Тесты проекции ToolDefinition[] → форма ответа tools/list (пакет 3.1.B)
 *
 * Контракт: server.ts каждого из трёх серверов вызывает
 * projectToolDefinitionsForList() вместо самостоятельной сборки объекта —
 * тест фиксирует форму и обратную совместимость (новые поля опциональны и не
 * ломают проекцию, когда их нет).
 */

import { describe, it, expect } from 'vitest';
import { projectToolDefinitionsForList } from '../../src/tool-registry/tools-list-projection.js';
import type { ToolDefinition } from '../../src/tools/base/index.js';

function makeDefinition(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test_tool',
    description: 'Test tool',
    inputSchema: { type: 'object', properties: {}, required: [] },
    ...overrides,
  };
}

describe('projectToolDefinitionsForList', () => {
  it('пропускает name/description/inputSchema для определения без новых полей', () => {
    const [entry] = projectToolDefinitionsForList([makeDefinition()]);

    expect(entry).toEqual({
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object', properties: {}, required: [] },
    });
  });

  it('НЕ добавляет title/outputSchema/annotations/_meta, если их нет в ToolDefinition', () => {
    const [entry] = projectToolDefinitionsForList([makeDefinition()]);

    expect(entry).not.toHaveProperty('title');
    expect(entry).not.toHaveProperty('outputSchema');
    expect(entry).not.toHaveProperty('annotations');
    expect(entry).not.toHaveProperty('_meta');
  });

  it('пропускает _meta наружу, когда задан на ToolDefinition (пакет 6.2 — MCP Apps _meta.ui.resourceUri)', () => {
    const [entry] = projectToolDefinitionsForList([
      makeDefinition({
        _meta: { ui: { resourceUri: 'ui://tracker/widget', visibility: ['model', 'app'] } },
      }),
    ]);

    expect(entry?._meta).toEqual({
      ui: { resourceUri: 'ui://tracker/widget', visibility: ['model', 'app'] },
    });
  });

  it('пропускает title, outputSchema и annotations наружу, когда они заданы', () => {
    const [entry] = projectToolDefinitionsForList([
      makeDefinition({
        title: 'Human-readable title',
        outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
        annotations: { readOnlyHint: true, idempotentHint: true },
      }),
    ]);

    expect(entry?.title).toBe('Human-readable title');
    expect(entry?.outputSchema).toEqual({
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    });
    expect(entry?.annotations).toEqual({ readOnlyHint: true, idempotentHint: true });
  });

  it('НЕ пропускает наружу category/subcategory/priority (внутренние поля реестра)', () => {
    const [entry] = projectToolDefinitionsForList([
      makeDefinition({ category: 'issues', subcategory: 'read', priority: 'critical' }),
    ]);

    expect(entry).not.toHaveProperty('category');
    expect(entry).not.toHaveProperty('subcategory');
    expect(entry).not.toHaveProperty('priority');
  });

  it('обрабатывает пустой список', () => {
    expect(projectToolDefinitionsForList([])).toEqual([]);
  });

  it('сохраняет порядок и обрабатывает несколько определений независимо', () => {
    const definitions = [
      makeDefinition({ name: 'a', title: 'A' }),
      makeDefinition({ name: 'b' }),
      makeDefinition({ name: 'c', annotations: { destructiveHint: true } }),
    ];

    const entries = projectToolDefinitionsForList(definitions);

    expect(entries.map((e) => e.name)).toEqual(['a', 'b', 'c']);
    expect(entries[0]?.title).toBe('A');
    expect(entries[1]).not.toHaveProperty('title');
    expect(entries[2]?.annotations).toEqual({ destructiveHint: true });
  });
});
