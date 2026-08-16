/**
 * Unit tests: режим ответа коллекционных инструментов (links/full/auto) —
 * пакет 5.1.C.ticktick плана модернизации MCP 2026-07-28.
 *
 * Проверяется на `GetAllTasksTool` как представителе всех инструментов,
 * применяющих `BaseTool.formatCollectionResult()` (тот же механизм
 * используют остальные 11 инструментов, тронутых пакетом — см. отчёт).
 *
 * DoD пакета, пункты 4 и 5:
 * 4. Инструмент отдаёт `resource_link` в режиме ссылок и тела в режиме тел;
 *    переключение параметром `responseMode`; порог (`DEFAULT_COLLECTION_LINKS_THRESHOLD`
 *    = 20) работает в обе стороны (граница снизу и сверху).
 * 5. Объём ответа в режиме ссылок СУЩЕСТВЕННО меньше — измеренное сравнение.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_COLLECTION_LINKS_THRESHOLD } from '@fractalizer/mcp-core';
import { GetAllTasksTool } from '#tools/tasks/get-all-tasks/get-all-tasks.tool.js';
import { createMockFacade, createMockLogger } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

/** Задача с "тяжёлым" содержимым — чтобы разница links/full была заметна на реалистичных данных. */
function makeTask(i: number): TaskWithUnknownFields {
  return {
    id: `task-${i}`,
    projectId: 'proj-1',
    title: `Task number ${i} with a reasonably descriptive title`,
    content:
      'Some longer content field that a real TickTick task would carry: notes, ' +
      'checklist context, links to other resources, and so on. '.repeat(30),
    priority: 3,
    status: 0,
    dueDate: '2026-01-01T00:00:00Z',
    createdTime: '2026-01-01T00:00:00Z',
    modifiedTime: '2026-01-01T00:00:00Z',
  };
}

interface StructuredCollectionData {
  mode: 'links' | 'full';
  itemsOnPage: number;
  threshold: number;
  items?: unknown[];
  resourceLinks?: { uri: string; name: string }[];
}

interface StructuredEnvelope {
  success: true;
  data: StructuredCollectionData;
}

describe('formatCollectionResult (GetAllTasksTool) — links/full/auto', () => {
  let mockFacade: ReturnType<typeof createMockFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let tool: GetAllTasksTool;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetAllTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
  });

  async function callWith(
    taskCount: number,
    responseMode?: 'auto' | 'links' | 'full'
  ): Promise<StructuredEnvelope> {
    mockFacade.getAllTasks.mockResolvedValue(
      Array.from({ length: taskCount }, (_, i) => makeTask(i))
    );
    const result = await tool.execute({
      fields: ['id', 'title', 'content'],
      ...(responseMode ? { responseMode } : {}),
    });
    return result.structuredContent as unknown as StructuredEnvelope;
  }

  it('auto: коллекция МЕНЬШЕ порога → полные тела (items), без resourceLinks', async () => {
    const envelope = await callWith(5, 'auto');

    expect(envelope.data.mode).toBe('full');
    expect(envelope.data.items).toHaveLength(5);
    expect(envelope.data.resourceLinks).toBeUndefined();
  });

  it('auto: коллекция БОЛЬШЕ порога → resourceLinks, без items', async () => {
    const envelope = await callWith(DEFAULT_COLLECTION_LINKS_THRESHOLD + 1, 'auto');

    expect(envelope.data.mode).toBe('links');
    expect(envelope.data.items).toBeUndefined();
    expect(envelope.data.resourceLinks).toHaveLength(DEFAULT_COLLECTION_LINKS_THRESHOLD + 1);
    expect(envelope.data.resourceLinks?.[0]?.uri).toMatch(/^ticktick:\/\/task\//);
  });

  it('порог работает в обе стороны: ровно N элементов → full, N+1 → links', async () => {
    const atThreshold = await callWith(DEFAULT_COLLECTION_LINKS_THRESHOLD, 'auto');
    expect(atThreshold.data.mode).toBe('full');

    const overThreshold = await callWith(DEFAULT_COLLECTION_LINKS_THRESHOLD + 1, 'auto');
    expect(overThreshold.data.mode).toBe('links');
  });

  it('responseMode="links" принудительно даёт ссылки даже для маленькой коллекции', async () => {
    const envelope = await callWith(2, 'links');

    expect(envelope.data.mode).toBe('links');
    expect(envelope.data.resourceLinks).toHaveLength(2);
  });

  it('responseMode="full" принудительно даёт полные тела даже для большой коллекции', async () => {
    const envelope = await callWith(DEFAULT_COLLECTION_LINKS_THRESHOLD + 10, 'full');

    expect(envelope.data.mode).toBe('full');
    expect(envelope.data.items).toHaveLength(DEFAULT_COLLECTION_LINKS_THRESHOLD + 10);
  });

  it('links-режим отдаёт content-блоки resource_link (не только JSON внутри structuredContent)', async () => {
    mockFacade.getAllTasks.mockResolvedValue(Array.from({ length: 3 }, (_, i) => makeTask(i)));
    const result = await tool.execute({ fields: ['id'], responseMode: 'links' });

    const linkBlocks = result.content.filter(
      (block): block is { type: 'resource_link'; uri: string; name: string } =>
        (block as { type: string }).type === 'resource_link'
    );
    expect(linkBlocks).toHaveLength(3);
    expect(linkBlocks[0]?.uri).toBe('ticktick://task/task-0');
  });

  it('объём ответа в режиме ссылок СУЩЕСТВЕННО меньше, чем в режиме тел (измеренное сравнение)', async () => {
    const taskCount = 100;
    const tasks = Array.from({ length: taskCount }, (_, i) => makeTask(i));

    mockFacade.getAllTasks.mockResolvedValue(tasks);
    const fullResult = await tool.execute({
      fields: ['id', 'title', 'content', 'dueDate', 'priority'],
      responseMode: 'full',
    });

    mockFacade.getAllTasks.mockResolvedValue(tasks);
    const linksResult = await tool.execute({
      fields: ['id', 'title', 'content', 'dueDate', 'priority'],
      responseMode: 'links',
    });

    const fullSize = JSON.stringify(fullResult).length;
    const linksSize = JSON.stringify(linksResult).length;

    expect(linksSize).toBeLessThan(fullSize * 0.3);
  });
});
