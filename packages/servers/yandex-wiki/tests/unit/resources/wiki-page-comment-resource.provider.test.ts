// tests/unit/resources/wiki-page-comment-resource.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import {
  WikiPageCommentResourceProvider,
  buildPageCommentResourceUri,
} from '../../../src/resources/wiki-page-comment-resource.provider.js';
import {
  createMockFacade,
  createCommentsResponseFixture,
  createCommentFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('WikiPageCommentResourceProvider', () => {
  let mockFacade: Partial<YandexWikiFacade>;
  let provider: WikiPageCommentResourceProvider;

  beforeEach(() => {
    mockFacade = createMockFacade();
    provider = new WikiPageCommentResourceProvider(mockFacade as YandexWikiFacade);
  });

  it('id — стабильный идентификатор провайдера', () => {
    expect(provider.id).toBe('wiki-page-comments');
  });

  describe('buildPageCommentResourceUri', () => {
    it('строит URI по схеме wiki://page-comment/{pageId}/{commentId}', () => {
      expect(buildPageCommentResourceUri(123, 501)).toBe('wiki://page-comment/123/501');
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
      expect(mockFacade.getComments).not.toHaveBeenCalled();
    });

    it('находит комментарий по id через getComments({idx, page_size: 100})', async () => {
      const response = createCommentsResponseFixture({
        results: [createCommentFixture({ id: 501, body: 'Found me' })],
      });
      vi.mocked(mockFacade.getComments!).mockResolvedValue(response);

      const uri = buildPageCommentResourceUri(123, 501);
      const result = await provider.readResource(uri);

      expect(mockFacade.getComments).toHaveBeenCalledWith({ idx: 123, page_size: 100 });
      expect(result).toHaveLength(1);
      expect(result?.[0]?.uri).toBe(uri);
      expect(result?.[0]?.mimeType).toBe('application/json');
      expect('text' in result![0]! ? (result![0] as { text: string }).text : '').toContain(
        'Found me'
      );
    });

    it('id не найден среди результатов — undefined', async () => {
      const response = createCommentsResponseFixture({
        results: [createCommentFixture({ id: 999 })],
      });
      vi.mocked(mockFacade.getComments!).mockResolvedValue(response);

      const uri = buildPageCommentResourceUri(123, 501);
      const result = await provider.readResource(uri);
      expect(result).toBeUndefined();
    });

    it('404 от API — undefined', async () => {
      vi.mocked(mockFacade.getComments!).mockRejectedValue(new ApiErrorClass(404, 'Not found'));

      const uri = buildPageCommentResourceUri(1, 501);
      const result = await provider.readResource(uri);
      expect(result).toBeUndefined();
    });

    it('прочие ошибки пробрасываются', async () => {
      vi.mocked(mockFacade.getComments!).mockRejectedValue(new ApiErrorClass(500, 'Boom'));

      const uri = buildPageCommentResourceUri(1, 501);
      await expect(provider.readResource(uri)).rejects.toThrow('Boom');
    });
  });

  describe('listTemplates', () => {
    it('описывает схему wiki://page-comment/{pageId}/{commentId}', () => {
      const templates = provider.listTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]?.uriTemplate).toBe('wiki://page-comment/{pageId}/{commentId}');
    });
  });
});
