// tests/unit/wiki_api/facade/services/page.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageService } from '../../../../../src/wiki_api/facade/services/page.service.js';
import type { PageOperationsContainer } from '../../../../../src/wiki_api/facade/services/containers/page-operations.container.js';
import { createPageFixture } from '../../../../helpers/page.fixture.js';

describe('PageService', () => {
  let pageService: PageService;
  let mockOps: PageOperationsContainer;

  beforeEach(() => {
    mockOps = {
      getPage: { execute: vi.fn() },
      getPageById: { execute: vi.fn() },
      createPage: { execute: vi.fn() },
      updatePage: { execute: vi.fn() },
      deletePage: { execute: vi.fn() },
      clonePage: { execute: vi.fn() },
      appendContent: { execute: vi.fn() },
    } as unknown as PageOperationsContainer;

    pageService = new PageService(mockOps);
  });

  describe('getPage', () => {
    it('должен делегировать вызов GetPageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockOps.getPage.execute).mockResolvedValue(mockPage);

      const params = { slug: 'test-page' };
      const result = await pageService.getPage(params);

      expect(mockOps.getPage.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('getPageById', () => {
    it('должен делегировать вызов GetPageByIdOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockOps.getPageById.execute).mockResolvedValue(mockPage);

      const params = { idx: 123 };
      const result = await pageService.getPageById(params);

      expect(mockOps.getPageById.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('createPage', () => {
    it('должен делегировать вызов CreatePageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockOps.createPage.execute).mockResolvedValue(mockPage);

      const params = { slug: 'new-page', body: 'content', title: 'New Page' };
      const result = await pageService.createPage(params);

      expect(mockOps.createPage.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('updatePage', () => {
    it('должен делегировать вызов UpdatePageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockOps.updatePage.execute).mockResolvedValue(mockPage);

      const params = { idx: 123, body: 'updated content' };
      const result = await pageService.updatePage(params);

      expect(mockOps.updatePage.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('deletePage', () => {
    it('должен делегировать вызов DeletePageOperation', async () => {
      const mockResult = { success: true };
      vi.mocked(mockOps.deletePage.execute).mockResolvedValue(mockResult);

      const result = await pageService.deletePage(123);

      expect(mockOps.deletePage.execute).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });

  describe('clonePage', () => {
    it('должен делегировать вызов ClonePageOperation', async () => {
      const mockAsyncOp = { status: 'in_progress', id: 'op-123' };
      vi.mocked(mockOps.clonePage.execute).mockResolvedValue(mockAsyncOp);

      const data = { targetSlug: 'cloned-page' };
      const result = await pageService.clonePage(123, data);

      expect(mockOps.clonePage.execute).toHaveBeenCalledWith(123, data);
      expect(result).toBe(mockAsyncOp);
    });
  });

  describe('appendContent', () => {
    it('должен делегировать вызов AppendContentOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockOps.appendContent.execute).mockResolvedValue(mockPage);

      const params = { idx: 123, content: 'appended content' };
      const result = await pageService.appendContent(params);

      expect(mockOps.appendContent.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });
});
