// tests/unit/resources/wiki-page-item-resource.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import {
  WikiPageItemResourceProvider,
  buildPageItemResourceUri,
} from '../../../src/resources/wiki-page-item-resource.provider.js';
import { createMockFacade, createResourcesResponseFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('WikiPageItemResourceProvider', () => {
  let mockFacade: Partial<YandexWikiFacade>;
  let provider: WikiPageItemResourceProvider;

  beforeEach(() => {
    mockFacade = createMockFacade();
    provider = new WikiPageItemResourceProvider(mockFacade as YandexWikiFacade);
  });

  it('id — стабильный идентификатор провайдера', () => {
    expect(provider.id).toBe('wiki-page-resources');
  });

  describe('buildPageItemResourceUri', () => {
    it('строит URI по схеме wiki://page-resource/{pageId}/{type}/{name}', () => {
      expect(buildPageItemResourceUri(123, 'attachment', 'document.pdf')).toBe(
        'wiki://page-resource/123/attachment/document.pdf'
      );
    });

    it('кодирует имя со спецсимволами', () => {
      expect(buildPageItemResourceUri(1, 'attachment', 'a b/c.pdf')).toBe(
        'wiki://page-resource/1/attachment/a%20b%2Fc.pdf'
      );
    });
  });

  describe('listResources', () => {
    it('честно пуст (провайдер привязан к конкретной странице, не глобален)', () => {
      expect(provider.listResources()).toEqual({ resources: [] });
    });
  });

  describe('readResource', () => {
    it('URI чужой схемы — undefined, facade не вызывается', async () => {
      const result = await provider.readResource('wiki://page/some-slug');
      expect(result).toBeUndefined();
      expect(mockFacade.getResources).not.toHaveBeenCalled();
    });

    it('URI типа grid — undefined БЕЗ обращения к API (таблицы вне Resources)', async () => {
      const result = await provider.readResource('wiki://page-resource/123/grid/MyGrid');
      expect(result).toBeUndefined();
      expect(mockFacade.getResources).not.toHaveBeenCalled();
    });

    it('находит вложение по имени через getResources({types, q})', async () => {
      const response = createResourcesResponseFixture({
        results: [{ type: 'attachment', item: { name: 'document.pdf', size: 1024 } }],
      });
      vi.mocked(mockFacade.getResources!).mockResolvedValue(response);

      const uri = buildPageItemResourceUri(123, 'attachment', 'document.pdf');
      const result = await provider.readResource(uri);

      expect(mockFacade.getResources).toHaveBeenCalledWith({
        idx: 123,
        types: ['attachment'],
        q: 'document.pdf',
        page_size: 50,
      });
      expect(result).toHaveLength(1);
      expect(result?.[0]?.uri).toBe(uri);
      expect(result?.[0]?.mimeType).toBe('application/json');
      expect('text' in result![0]! ? (result![0] as { text: string }).text : '').toContain(
        'document.pdf'
      );
    });

    it('имя не найдено среди результатов поиска — undefined', async () => {
      const response = createResourcesResponseFixture({
        results: [{ type: 'attachment', item: { name: 'other.pdf' } }],
      });
      vi.mocked(mockFacade.getResources!).mockResolvedValue(response);

      const uri = buildPageItemResourceUri(123, 'attachment', 'document.pdf');
      const result = await provider.readResource(uri);
      expect(result).toBeUndefined();
    });

    it('404 от API — undefined', async () => {
      vi.mocked(mockFacade.getResources!).mockRejectedValue(new ApiErrorClass(404, 'Not found'));

      const uri = buildPageItemResourceUri(1, 'attachment', 'x');
      const result = await provider.readResource(uri);
      expect(result).toBeUndefined();
    });

    it('прочие ошибки пробрасываются', async () => {
      vi.mocked(mockFacade.getResources!).mockRejectedValue(new ApiErrorClass(500, 'Boom'));

      const uri = buildPageItemResourceUri(1, 'attachment', 'x');
      await expect(provider.readResource(uri)).rejects.toThrow('Boom');
    });
  });

  describe('listTemplates', () => {
    it('описывает схему wiki://page-resource/{pageId}/{type}/{name}', () => {
      const templates = provider.listTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]?.uriTemplate).toBe('wiki://page-resource/{pageId}/{type}/{name}');
    });
  });
});
