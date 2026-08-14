/**
 * Тесты `BaseTool.formatCollectionResult()` (пакет 5.1.B плана
 * модернизации MCP 2026-07-28).
 *
 * DoD пакета:
 *  - инструмент с коллекцией в режиме ссылок отдаёт `resource_link`,
 *    в режиме тел — тела; переключение параметром;
 *  - порог по умолчанию работает в обе стороны (auto: маленькая коллекция
 *    телами, большая — ссылками);
 *  - объём ответа в режиме ссылок measured существенно меньше, чем в
 *    режиме тел (сравнение по байтам сериализованного content, не «на глаз»).
 *
 * Тест — на тестовом инструменте фреймворка (не на реальном инструменте
 * сервера), как того требует задание.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { BaseTool } from '../../../../src/tools/base/base-tool.js';
import type { ToolDefinition } from '../../../../src/tools/base/index.js';
import {
  DEFAULT_COLLECTION_LINKS_THRESHOLD,
  type CollectionResponseMode,
} from '../../../../src/tools/common/collection-result/collection-response-mode.js';
import type { ResourceLinkDescriptor } from '../../../../src/resources/resource-link-content.js';

/** Один "объёмный" элемент коллекции — имитирует тело реальной сущности (issue/page/task). */
interface FakeItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly assignee: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

function buildFakeItems(count: number): FakeItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ITEM-${i + 1}`,
    title: `Заголовок задачи номер ${i + 1} — что-то содержательное для объёма`,
    // Реалистичный размер тела сущности (issue/page/task с описанием) —
    // достаточно объёмный, чтобы разница между полным телом и компактной
    // ссылкой resource_link была не косметической, а измеримой на порядок.
    description:
      'Достаточно длинное описание элемента коллекции, чтобы полное тело весило заметно ' +
      'больше, чем компактная ссылка resource_link на тот же элемент. '.repeat(15),
    status: 'in_progress',
    assignee: 'user.example',
    tags: ['backend', 'urgent', 'reviewed'],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
  }));
}

function toResourceLink(item: FakeItem): ResourceLinkDescriptor {
  return {
    uri: `test://item/${item.id}`,
    name: item.id,
    title: item.title,
  };
}

/** Тестовый инструмент фреймворка: коллекция FakeItem с переключаемым режимом ответа. */
class FakeCollectionTool extends BaseTool<void> {
  static override METADATA = {
    category: 'system',
    priority: 'normal' as const,
  };

  constructor(
    private readonly items: FakeItem[],
    logger: Logger
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(null as any, logger);
  }

  override getDefinition(): ToolDefinition {
    return {
      name: 'fake_collection_tool',
      description: 'Тестовый инструмент-коллекция',
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }

  override async execute(params: ToolCallParams): Promise<ToolResult> {
    const mode = (params['responseMode'] as CollectionResponseMode | undefined) ?? 'auto';
    return this.formatCollectionResult({
      items: this.items,
      mode,
      toResourceLink,
    });
  }
}

function buildLogger(): Logger {
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  logger.child.mockReturnValue(logger);
  return logger;
}

describe('BaseTool.formatCollectionResult', () => {
  describe('переключение режима параметром', () => {
    it('mode="links" отдаёт resource_link для каждого элемента, независимо от их количества', async () => {
      const items = buildFakeItems(3);
      const tool = new FakeCollectionTool(items, buildLogger());

      const result = await tool.execute({ responseMode: 'links' });

      const structured = result.structuredContent as {
        data: { mode: string; resourceLinks?: unknown[] };
      };
      expect(structured.data.mode).toBe('links');
      expect(structured.data.resourceLinks).toHaveLength(3);

      const linkBlocks = result.content.filter((c) => c['type'] === 'resource_link');
      expect(linkBlocks).toHaveLength(3);
      expect(linkBlocks[0]).toMatchObject({
        type: 'resource_link',
        uri: 'test://item/ITEM-1',
        name: 'ITEM-1',
      });

      // В режиме links текстовый JSON-дубль НЕ содержит полных тел items.
      const textBlock = result.content.find((c) => c['type'] === 'text');
      expect(textBlock?.['text']).not.toContain('"description"');
    });

    it('mode="full" отдаёт полные тела, независимо от их количества', async () => {
      const items = buildFakeItems(3);
      const tool = new FakeCollectionTool(items, buildLogger());

      const result = await tool.execute({ responseMode: 'full' });

      const structured = result.structuredContent as {
        data: { mode: string; items?: FakeItem[] };
      };
      expect(structured.data.mode).toBe('full');
      expect(structured.data.items).toHaveLength(3);
      expect(structured.data.items?.[0]?.description).toContain('Достаточно длинное описание');

      // В режиме full нет content-блоков resource_link.
      const linkBlocks = result.content.filter((c) => c['type'] === 'resource_link');
      expect(linkBlocks).toHaveLength(0);
    });
  });

  describe('порог по умолчанию (mode="auto")', () => {
    it('маленькая коллекция (<= порога) отдаётся телами', async () => {
      const items = buildFakeItems(DEFAULT_COLLECTION_LINKS_THRESHOLD);
      const tool = new FakeCollectionTool(items, buildLogger());

      const result = await tool.execute({ responseMode: 'auto' });

      const structured = result.structuredContent as { data: { mode: string } };
      expect(structured.data.mode).toBe('full');
      expect(result.content.filter((c) => c['type'] === 'resource_link')).toHaveLength(0);
    });

    it('большая коллекция (> порога) отдаётся ссылками', async () => {
      const items = buildFakeItems(DEFAULT_COLLECTION_LINKS_THRESHOLD + 1);
      const tool = new FakeCollectionTool(items, buildLogger());

      const result = await tool.execute({ responseMode: 'auto' });

      const structured = result.structuredContent as { data: { mode: string } };
      expect(structured.data.mode).toBe('links');
      expect(result.content.filter((c) => c['type'] === 'resource_link')).toHaveLength(
        DEFAULT_COLLECTION_LINKS_THRESHOLD + 1
      );
    });

    it('без явного responseMode инструмент по умолчанию ведёт себя как auto', async () => {
      const smallItems = buildFakeItems(2);
      const tool = new FakeCollectionTool(smallItems, buildLogger());

      const result = await tool.execute({});

      const structured = result.structuredContent as { data: { mode: string } };
      expect(structured.data.mode).toBe('full');
    });
  });

  describe('экономия объёма ответа в режиме ссылок (measured)', () => {
    it('сериализованный content в режиме links существенно меньше, чем в режиме full', async () => {
      const items = buildFakeItems(50);
      const linksTool = new FakeCollectionTool(items, buildLogger());
      const fullTool = new FakeCollectionTool(items, buildLogger());

      const linksResult = await linksTool.execute({ responseMode: 'links' });
      const fullResult = await fullTool.execute({ responseMode: 'full' });

      const linksBytes = Buffer.byteLength(JSON.stringify(linksResult.content), 'utf8');
      const fullBytes = Buffer.byteLength(JSON.stringify(fullResult.content), 'utf8');

      // Требование DoD: "объём ответа в режиме ссылок существенно меньше" —
      // measured-сравнение, не "на глаз". Порог x3 — заведомо строгий:
      // при 50 объёмных элементах экономия на практике на порядок больше.
      expect(linksBytes).toBeLessThan(fullBytes / 3);
    });
  });
});
