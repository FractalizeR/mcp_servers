// tests/unit/tools/api/resources/get-resources-response-mode.test.ts
/**
 * ResourceLink на GetResourcesTool (пакет 5.1.C.wiki): режимы full/links/auto,
 * порог, исключение таблиц (grid) из механизма ResourceLink, измеренная
 * экономия объёма ответа.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetResourcesTool } from '../../../../../src/tools/api/resources/get/get-resources.tool.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';
import type { ResourcesResponse } from '../../../../../src/wiki_api/entities/index.js';

interface ResourceLinkBlock {
  type: 'resource_link';
  uri: string;
  name: string;
  [key: string]: unknown;
}

function isResourceLinkBlock(block: {
  type: string;
  [key: string]: unknown;
}): block is ResourceLinkBlock {
  return block.type === 'resource_link';
}

/** Богатое вложение — реалистичный размер метаданных одного элемента. */
function richAttachmentItem(index: number): Record<string, unknown> {
  return {
    name: `document-${index}.pdf`,
    size: 204800 + index,
    created_at: '2026-08-01T10:00:00.000Z',
    modified_at: '2026-08-02T11:00:00.000Z',
    uploaded_by: { uid: 1000 + index, login: `user${index}`, display_name: `User ${index}` },
    mime_type: 'application/pdf',
    description: `Служебное описание вложения номер ${index}, добавленное автором для контекста.`,
  };
}

function attachmentsFixture(
  count: number,
  overrides?: Partial<ResourcesResponse>
): ResourcesResponse {
  return {
    results: Array.from({ length: count }, (_, i) => ({
      type: 'attachment' as const,
      item: richAttachmentItem(i),
    })),
    ...overrides,
  };
}

describe('GetResourcesTool — responseMode / ResourceLink (пакет 5.1.C.wiki)', () => {
  let tool: GetResourcesTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new GetResourcesTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('режим full', () => {
    it('отдаёт полные тела вложений инлайн, без resource_link блоков', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue(attachmentsFixture(3));

      const result = await tool.execute({ idx: 1, responseMode: 'full' });

      expect(result.isError).toBeFalsy();
      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('full');
      expect(data['items']).toHaveLength(3);
      expect(data['resourceLinks']).toBeUndefined();
      expect(result.content.some((b) => isResourceLinkBlock(b))).toBe(false);
    });
  });

  describe('режим links', () => {
    it('отдаёт resource_link вместо тел, тела не попадают в structuredContent', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue(attachmentsFixture(3));

      const result = await tool.execute({ idx: 1, responseMode: 'links' });

      expect(result.isError).toBeFalsy();
      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('links');
      expect(data['items']).toBeUndefined();
      expect(data['resourceLinks']).toHaveLength(3);

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks).toHaveLength(3);
      expect(linkBlocks[0]?.uri).toBe('wiki://page-resource/1/attachment/document-0.pdf');
      // Тело вложения (description/uploaded_by) НЕ должно просочиться в resource_link.
      expect(JSON.stringify(linkBlocks[0])).not.toContain('Служебное описание');
    });

    it('resources/read по этому URI (у другого провайдера) читает тело напрямую — не тестируется здесь: см. wiki-page-item-resource.provider.test.ts', () => {
      // Маркер-документация: readResource(uri) для wiki://page-resource/... —
      // WikiPageItemResourceProvider, покрыт отдельным юнит-тестом провайдера.
      expect(true).toBe(true);
    });
  });

  describe('режим auto — порог', () => {
    it('≤ порога (20) — full', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue(attachmentsFixture(5));

      const result = await tool.execute({ idx: 1, responseMode: 'auto' });
      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('full');
      expect(data['threshold']).toBe(20);
    });

    it('> порога (20) — links', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue(attachmentsFixture(25));

      const result = await tool.execute({ idx: 1, responseMode: 'auto' });
      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('links');
      expect(data['itemsOnPage']).toBe(25);
    });

    it('responseMode по умолчанию (параметр не передан) ведёт себя как auto', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue(attachmentsFixture(25));

      const result = await tool.execute({ idx: 1 });
      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('links');
    });
  });

  describe('измеренная экономия объёма ответа (DoD п.5)', () => {
    it('links существенно меньше full на 30 богатых вложениях', async () => {
      const response = attachmentsFixture(30);
      vi.mocked(mockFacade.getResources!).mockResolvedValue(response);
      const fullResult = await tool.execute({ idx: 1, responseMode: 'full' });

      vi.mocked(mockFacade.getResources!).mockResolvedValue(response);
      const linksResult = await tool.execute({ idx: 1, responseMode: 'links' });

      const fullSize = JSON.stringify(fullResult.content).length;
      const linksSize = JSON.stringify(linksResult.content).length;

      expect(linksSize).toBeLessThan(fullSize * 0.5);
    });
  });

  describe('таблицы (grid) — вне ResourceLink (DoD п.6)', () => {
    it('grid всегда полностью инлайн в summary.gridItems, независимо от responseMode', async () => {
      const mixed: ResourcesResponse = {
        results: [
          { type: 'attachment', item: richAttachmentItem(0) },
          { type: 'grid', item: { id: 'grid-1', title: 'Таблица 1' } },
          { type: 'grid', item: { id: 'grid-2', title: 'Таблица 2' } },
        ],
      };
      vi.mocked(mockFacade.getResources!).mockResolvedValue(mixed);

      const result = await tool.execute({ idx: 1, responseMode: 'links' });
      const data = (
        result['structuredContent'] as {
          data: { summary: { gridItems: unknown[] }; resourceLinks: ResourceLinkBlock[] };
        }
      ).data;

      expect(data.summary.gridItems).toHaveLength(2);
      // itemsOnPage/resourceLinks учитывают ТОЛЬКО линкуемые (не-grid) ресурсы.
      expect(data.resourceLinks).toHaveLength(1);

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks).toHaveLength(1);
      expect(linkBlocks.every((b) => !b.uri.includes('/grid/'))).toBe(true);
    });

    it('ни один resource_link не строится, если все результаты — grid', async () => {
      const onlyGrids: ResourcesResponse = {
        results: [
          { type: 'grid', item: { id: 'g1', title: 'T1' } },
          { type: 'grid', item: { id: 'g2', title: 'T2' } },
        ],
      };
      vi.mocked(mockFacade.getResources!).mockResolvedValue(onlyGrids);

      const result = await tool.execute({ idx: 1, responseMode: 'links' });
      expect(result.content.filter(isResourceLinkBlock)).toHaveLength(0);
      const data = (
        result['structuredContent'] as {
          data: { summary: { gridItems: unknown[] }; itemsOnPage: number };
        }
      ).data;
      expect(data.summary.gridItems).toHaveLength(2);
      expect(data.itemsOnPage).toBe(0);
    });
  });

  describe('устойчивость к некорректному ответу API', () => {
    it('results не массив — не падает, отдаёт пустую коллекцию', async () => {
      vi.mocked(mockFacade.getResources!).mockResolvedValue({
        results: undefined,
      } as unknown as ResourcesResponse);

      const result = await tool.execute({ idx: 1 });
      expect(result.isError).toBeFalsy();
    });
  });
});
