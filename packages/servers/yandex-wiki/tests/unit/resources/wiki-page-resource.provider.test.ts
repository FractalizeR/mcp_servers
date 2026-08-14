// tests/unit/resources/wiki-page-resource.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import { WikiPageResourceProvider } from '../../../src/resources/wiki-page-resource.provider.js';
import { createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('WikiPageResourceProvider', () => {
  let mockFacade: Partial<YandexWikiFacade>;
  let provider: WikiPageResourceProvider;

  beforeEach(() => {
    mockFacade = createMockFacade();
    provider = new WikiPageResourceProvider(mockFacade as YandexWikiFacade);
  });

  it('id — стабильный идентификатор провайдера', () => {
    expect(provider.id).toBe('wiki-pages');
  });

  describe('listResources', () => {
    it('честно пуст (нет эндпоинта полного обзора страниц) и без nextCursor', () => {
      const page = provider.listResources();
      expect(page).toEqual({ resources: [] });
    });
  });

  describe('readResource', () => {
    it('URI чужой схемы — undefined, facade не вызывается', async () => {
      const result = await provider.readResource('tracker://issue/PROJ-1');
      expect(result).toBeUndefined();
      expect(mockFacade.getPage).not.toHaveBeenCalled();
    });

    it('URI без slug (wiki://page/) — undefined, facade не вызывается', async () => {
      const result = await provider.readResource('wiki://page/');
      expect(result).toBeUndefined();
      expect(mockFacade.getPage).not.toHaveBeenCalled();
    });

    it('разрешает slug НАПРЯМУЮ, даже если его не было в listResources (DoD п.2)', async () => {
      const page = createPageFixture({
        slug: 'users/docs/readme',
        title: 'Readme',
        content: '# Заголовок\n\nТело страницы.',
      });
      vi.mocked(mockFacade.getPage!).mockResolvedValue(page);

      const result = await provider.readResource('wiki://page/users/docs/readme');

      expect(mockFacade.getPage).toHaveBeenCalledWith({
        slug: 'users/docs/readme',
        fields: 'content',
      });
      expect(result).toHaveLength(1);
      const [contents] = result!;
      expect(contents.uri).toBe('wiki://page/users/docs/readme');
      expect('text' in contents ? contents.text : '').toContain('Тело страницы.');
      expect('text' in contents ? contents.text : '').toContain('Readme');
      expect(contents.mimeType).toBe('text/markdown');
    });

    it('slug с вложенными сегментами (path) передаётся как есть', async () => {
      const page = createPageFixture({ slug: 'a/b/c', title: 'T', content: 'x' });
      vi.mocked(mockFacade.getPage!).mockResolvedValue(page);

      await provider.readResource('wiki://page/a/b/c');

      expect(mockFacade.getPage).toHaveBeenCalledWith({ slug: 'a/b/c', fields: 'content' });
    });

    it('страница без content — рендерит плейсхолдер, а не падает', async () => {
      const page = createPageFixture({ slug: 'empty', title: 'Empty' });
      vi.mocked(mockFacade.getPage!).mockResolvedValue(page);

      const result = await provider.readResource('wiki://page/empty');
      const [contents] = result!;
      expect('text' in contents ? contents.text : '').toContain('пусто');
    });

    it('404 от API — undefined (не ошибка), контракт ResourceProvider', async () => {
      vi.mocked(mockFacade.getPage!).mockRejectedValue(new ApiErrorClass(404, 'Not found'));

      const result = await provider.readResource('wiki://page/no-such-page');
      expect(result).toBeUndefined();
    });

    it('прочие ошибки API пробрасываются, а не глушатся', async () => {
      vi.mocked(mockFacade.getPage!).mockRejectedValue(new ApiErrorClass(500, 'Server error'));

      await expect(provider.readResource('wiki://page/broken')).rejects.toThrow('Server error');
    });

    it('неизвестная (не ApiErrorClass) ошибка тоже пробрасывается', async () => {
      vi.mocked(mockFacade.getPage!).mockRejectedValue(new Error('network down'));

      await expect(provider.readResource('wiki://page/x')).rejects.toThrow('network down');
    });
  });

  describe('listTemplates', () => {
    it('описывает схему wiki://page/{slug}', () => {
      const templates = provider.listTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]?.uriTemplate).toBe('wiki://page/{slug}');
      expect(templates[0]?.mimeType).toBe('text/markdown');
    });
  });
});
