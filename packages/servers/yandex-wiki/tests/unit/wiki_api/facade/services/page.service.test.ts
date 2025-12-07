// tests/unit/wiki_api/facade/services/page.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageService } from '../../../../../src/wiki_api/facade/services/page.service.js';
import type {
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
} from '../../../../../src/wiki_api/api_operations/index.js';
import { createPageFixture } from '../../../../helpers/page.fixture.js';

describe('PageService', () => {
  let pageService: PageService;
  let mockGetPageOp: GetPageOperation;
  let mockGetPageByIdOp: GetPageByIdOperation;
  let mockCreatePageOp: CreatePageOperation;
  let mockUpdatePageOp: UpdatePageOperation;
  let mockDeletePageOp: DeletePageOperation;
  let mockClonePageOp: ClonePageOperation;
  let mockAppendContentOp: AppendContentOperation;

  beforeEach(() => {
    mockGetPageOp = { execute: vi.fn() } as unknown as GetPageOperation;
    mockGetPageByIdOp = { execute: vi.fn() } as unknown as GetPageByIdOperation;
    mockCreatePageOp = { execute: vi.fn() } as unknown as CreatePageOperation;
    mockUpdatePageOp = { execute: vi.fn() } as unknown as UpdatePageOperation;
    mockDeletePageOp = { execute: vi.fn() } as unknown as DeletePageOperation;
    mockClonePageOp = { execute: vi.fn() } as unknown as ClonePageOperation;
    mockAppendContentOp = { execute: vi.fn() } as unknown as AppendContentOperation;

    pageService = new PageService(
      mockGetPageOp,
      mockGetPageByIdOp,
      mockCreatePageOp,
      mockUpdatePageOp,
      mockDeletePageOp,
      mockClonePageOp,
      mockAppendContentOp
    );
  });

  describe('getPage', () => {
    it('должен делегировать вызов GetPageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockGetPageOp.execute).mockResolvedValue(mockPage);

      const params = { slug: 'test-page' };
      const result = await pageService.getPage(params);

      expect(mockGetPageOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('getPageById', () => {
    it('должен делегировать вызов GetPageByIdOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockGetPageByIdOp.execute).mockResolvedValue(mockPage);

      const params = { idx: 123 };
      const result = await pageService.getPageById(params);

      expect(mockGetPageByIdOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('createPage', () => {
    it('должен делегировать вызов CreatePageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockCreatePageOp.execute).mockResolvedValue(mockPage);

      const params = { slug: 'new-page', body: 'content', title: 'New Page' };
      const result = await pageService.createPage(params);

      expect(mockCreatePageOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('updatePage', () => {
    it('должен делегировать вызов UpdatePageOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockUpdatePageOp.execute).mockResolvedValue(mockPage);

      const params = { idx: 123, body: 'updated content' };
      const result = await pageService.updatePage(params);

      expect(mockUpdatePageOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });

  describe('deletePage', () => {
    it('должен делегировать вызов DeletePageOperation', async () => {
      const mockResult = { success: true };
      vi.mocked(mockDeletePageOp.execute).mockResolvedValue(mockResult);

      const result = await pageService.deletePage(123);

      expect(mockDeletePageOp.execute).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });

  describe('clonePage', () => {
    it('должен делегировать вызов ClonePageOperation', async () => {
      const mockAsyncOp = { status: 'in_progress', id: 'op-123' };
      vi.mocked(mockClonePageOp.execute).mockResolvedValue(mockAsyncOp);

      const data = { targetSlug: 'cloned-page' };
      const result = await pageService.clonePage(123, data);

      expect(mockClonePageOp.execute).toHaveBeenCalledWith(123, data);
      expect(result).toBe(mockAsyncOp);
    });
  });

  describe('appendContent', () => {
    it('должен делегировать вызов AppendContentOperation', async () => {
      const mockPage = createPageFixture();
      vi.mocked(mockAppendContentOp.execute).mockResolvedValue(mockPage);

      const params = { idx: 123, content: 'appended content' };
      const result = await pageService.appendContent(params);

      expect(mockAppendContentOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockPage);
    });
  });
});
