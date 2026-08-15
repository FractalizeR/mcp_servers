// tests/unit/wiki_api/facade/yandex-wiki.facade.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import type {
  PageService,
  GridService,
  ResourceService,
  RawApiService,
  SearchService,
  CommentService,
  PageAccessService,
  AttachmentService,
} from '#wiki_api/facade/services/index.js';
import {
  createPageFixture,
  createGridFixture,
  createDeleteResultFixture,
  createDeleteGridResultFixture,
  createAsyncOperationFixture,
  createResourcesResponseFixture,
  createDescendantsResponseFixture,
  createSearchResponseFixture,
  createCommentFixture,
  createCommentsResponseFixture,
  createPageAccessFixture,
} from '#helpers/index.js';

describe('YandexWikiFacade', () => {
  let facade: YandexWikiFacade;
  let mockPageService: Partial<PageService>;
  let mockGridService: Partial<GridService>;
  let mockResourceService: Partial<ResourceService>;
  let mockRawApiService: Partial<RawApiService>;
  let mockSearchService: Partial<SearchService>;
  let mockCommentService: Partial<CommentService>;
  let mockPageAccessService: Partial<PageAccessService>;
  let mockAttachmentService: Partial<AttachmentService>;

  beforeEach(() => {
    mockPageService = {
      getPage: vi.fn(),
      getPageById: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
      deletePage: vi.fn(),
      clonePage: vi.fn(),
      appendContent: vi.fn(),
      getDescendantsById: vi.fn(),
      getDescendantsBySlug: vi.fn(),
    };

    mockGridService = {
      createGrid: vi.fn(),
      getGrid: vi.fn(),
      updateGrid: vi.fn(),
      deleteGrid: vi.fn(),
      addRows: vi.fn(),
      removeRows: vi.fn(),
      addColumns: vi.fn(),
      removeColumns: vi.fn(),
      updateCells: vi.fn(),
      moveRows: vi.fn(),
      moveColumns: vi.fn(),
      cloneGrid: vi.fn(),
    };

    mockResourceService = {
      getResources: vi.fn(),
    };

    mockRawApiService = {
      request: vi.fn(),
    };

    mockSearchService = {
      search: vi.fn(),
    };

    mockCommentService = {
      getComments: vi.fn(),
      createComment: vi.fn(),
      getCommentThread: vi.fn(),
      deleteComment: vi.fn(),
    };

    mockPageAccessService = {
      createPageAccess: vi.fn(),
      updatePageAccess: vi.fn(),
      deletePageAccess: vi.fn(),
      deleteAllPageAccesses: vi.fn(),
    };

    mockAttachmentService = {
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
    };

    facade = new YandexWikiFacade(
      mockPageService as PageService,
      mockGridService as GridService,
      mockResourceService as ResourceService,
      mockRawApiService as RawApiService,
      mockSearchService as SearchService,
      mockCommentService as CommentService,
      mockPageAccessService as PageAccessService,
      mockAttachmentService as AttachmentService
    );
  });

  describe('Page Methods', () => {
    it('должен вызвать pageService.getPage', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockPageService.getPage!).mockResolvedValue(expectedPage);

      const result = await facade.getPage({ slug: 'users/test' });

      expect(mockPageService.getPage).toHaveBeenCalledWith({ slug: 'users/test' });
      expect(result).toEqual(expectedPage);
    });

    it('должен вызвать pageService.getPageById', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockPageService.getPageById!).mockResolvedValue(expectedPage);

      const result = await facade.getPageById({ idx: 123 });

      expect(mockPageService.getPageById).toHaveBeenCalledWith({ idx: 123 });
      expect(result).toEqual(expectedPage);
    });

    it('должен вызвать pageService.createPage', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockPageService.createPage!).mockResolvedValue(expectedPage);

      const params = {
        data: { page_type: 'page' as const, slug: 'users/new', title: 'New Page' },
      };
      const result = await facade.createPage(params);

      expect(mockPageService.createPage).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedPage);
    });

    it('должен вызвать pageService.updatePage', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockPageService.updatePage!).mockResolvedValue(expectedPage);

      const params = { idx: 123, data: { title: 'Updated' } };
      const result = await facade.updatePage(params);

      expect(mockPageService.updatePage).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedPage);
    });

    it('должен вызвать pageService.deletePage', async () => {
      const expectedResult = createDeleteResultFixture();
      vi.mocked(mockPageService.deletePage!).mockResolvedValue(expectedResult);

      const result = await facade.deletePage({ idx: 123 });

      expect(mockPageService.deletePage).toHaveBeenCalledWith({ idx: 123 });
      expect(result).toEqual(expectedResult);
    });

    it('должен вызвать pageService.clonePage', async () => {
      const expectedResult = createAsyncOperationFixture();
      vi.mocked(mockPageService.clonePage!).mockResolvedValue(expectedResult);

      const result = await facade.clonePage(123, { target: 'users/cloned' });

      expect(mockPageService.clonePage).toHaveBeenCalledWith(123, { target: 'users/cloned' });
      expect(result).toEqual(expectedResult);
    });

    it('должен вызвать pageService.appendContent', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockPageService.appendContent!).mockResolvedValue(expectedPage);

      const params = { idx: 123, data: { content: '## New' } };
      const result = await facade.appendContent(params);

      expect(mockPageService.appendContent).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedPage);
    });

    it('должен вызвать pageService.getDescendantsById', async () => {
      const expectedResponse = createDescendantsResponseFixture();
      vi.mocked(mockPageService.getDescendantsById!).mockResolvedValue(expectedResponse);

      const result = await facade.getDescendantsById({ idx: 123 });

      expect(mockPageService.getDescendantsById).toHaveBeenCalledWith({ idx: 123 });
      expect(result).toEqual(expectedResponse);
    });

    it('должен вызвать pageService.getDescendantsBySlug', async () => {
      const expectedResponse = createDescendantsResponseFixture();
      vi.mocked(mockPageService.getDescendantsBySlug!).mockResolvedValue(expectedResponse);

      const result = await facade.getDescendantsBySlug({ slug: 'users/test/section' });

      expect(mockPageService.getDescendantsBySlug).toHaveBeenCalledWith({
        slug: 'users/test/section',
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Grid Methods', () => {
    it('должен вызвать gridService.createGrid', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.createGrid!).mockResolvedValue(expectedGrid);

      const data = {
        title: 'New Grid',
        page: { slug: 'users/test' },
      };
      const result = await facade.createGrid(data);

      expect(mockGridService.createGrid).toHaveBeenCalledWith(data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.getGrid', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.getGrid!).mockResolvedValue(expectedGrid);

      const result = await facade.getGrid({ idx: 'grid-123' });

      expect(mockGridService.getGrid).toHaveBeenCalledWith({ idx: 'grid-123' });
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.updateGrid', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.updateGrid!).mockResolvedValue(expectedGrid);

      const result = await facade.updateGrid('grid-123', { title: 'Updated', revision: 'rev-1' });

      expect(mockGridService.updateGrid).toHaveBeenCalledWith('grid-123', {
        title: 'Updated',
        revision: 'rev-1',
      });
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.deleteGrid', async () => {
      const expectedResult = createDeleteGridResultFixture();
      vi.mocked(mockGridService.deleteGrid!).mockResolvedValue(expectedResult);

      const result = await facade.deleteGrid('grid-123');

      expect(mockGridService.deleteGrid).toHaveBeenCalledWith('grid-123');
      expect(result).toEqual(expectedResult);
    });

    it('должен вызвать gridService.addRows', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.addRows!).mockResolvedValue(expectedGrid);

      const data = { rows: [{ row: ['Test'] }] };
      const result = await facade.addRows('grid-123', data);

      expect(mockGridService.addRows).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.removeRows', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.removeRows!).mockResolvedValue(expectedGrid);

      const data = { row_ids: ['row-1'] };
      const result = await facade.removeRows('grid-123', data);

      expect(mockGridService.removeRows).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.addColumns', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.addColumns!).mockResolvedValue(expectedGrid);

      const data = {
        columns: [{ title: 'Col', slug: 'col', type: 'string' as const, required: false }],
      };
      const result = await facade.addColumns('grid-123', data);

      expect(mockGridService.addColumns).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.removeColumns', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.removeColumns!).mockResolvedValue(expectedGrid);

      const data = { column_slugs: ['col1'] };
      const result = await facade.removeColumns('grid-123', data);

      expect(mockGridService.removeColumns).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.updateCells', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.updateCells!).mockResolvedValue(expectedGrid);

      const data = {
        cells: [{ row_id: 'row-1', column_slug: 'col1', value: 'Updated' }],
      };
      const result = await facade.updateCells('grid-123', data);

      expect(mockGridService.updateCells).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.moveRows', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.moveRows!).mockResolvedValue(expectedGrid);

      const data = { row_id: 'row-1', after_row_id: 'row-5' };
      const result = await facade.moveRows('grid-123', data);

      expect(mockGridService.moveRows).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.moveColumns', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.moveColumns!).mockResolvedValue(expectedGrid);

      const data = { column_slug: 'col1', position: 5 };
      const result = await facade.moveColumns('grid-123', data);

      expect(mockGridService.moveColumns).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.cloneGrid', async () => {
      const expectedResult = createAsyncOperationFixture();
      vi.mocked(mockGridService.cloneGrid!).mockResolvedValue(expectedResult);

      const result = await facade.cloneGrid('grid-123', { target: 'users/cloned-grid' });

      expect(mockGridService.cloneGrid).toHaveBeenCalledWith('grid-123', {
        target: 'users/cloned-grid',
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Resource Methods', () => {
    it('должен вызвать resourceService.getResources', async () => {
      const expectedResponse = createResourcesResponseFixture();
      vi.mocked(mockResourceService.getResources!).mockResolvedValue(expectedResponse);

      const result = await facade.getResources({ idx: 123 });

      expect(mockResourceService.getResources).toHaveBeenCalledWith({ idx: 123 });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Search Methods', () => {
    it('должен вызвать searchService.search', async () => {
      const expectedResponse = createSearchResponseFixture();
      vi.mocked(mockSearchService.search!).mockResolvedValue(expectedResponse);

      const result = await facade.search({ query: 'test' });

      expect(mockSearchService.search).toHaveBeenCalledWith({ query: 'test' });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('Comment Methods', () => {
    it('должен вызвать commentService.getComments', async () => {
      const expected = createCommentsResponseFixture();
      vi.mocked(mockCommentService.getComments!).mockResolvedValue(expected);

      const result = await facade.getComments({ idx: 123 });

      expect(mockCommentService.getComments).toHaveBeenCalledWith({ idx: 123 });
      expect(result).toEqual(expected);
    });

    it('должен вызвать commentService.createComment', async () => {
      const expected = createCommentFixture();
      vi.mocked(mockCommentService.createComment!).mockResolvedValue(expected);

      const result = await facade.createComment(123, { body: 'Hi' });

      expect(mockCommentService.createComment).toHaveBeenCalledWith(123, { body: 'Hi' });
      expect(result).toEqual(expected);
    });

    it('должен вызвать commentService.getCommentThread', async () => {
      const expected = createCommentsResponseFixture();
      vi.mocked(mockCommentService.getCommentThread!).mockResolvedValue(expected);

      const result = await facade.getCommentThread({ idx: 123, comment_id: 501 });

      expect(mockCommentService.getCommentThread).toHaveBeenCalledWith({
        idx: 123,
        comment_id: 501,
      });
      expect(result).toEqual(expected);
    });

    it('должен вызвать commentService.deleteComment', async () => {
      const expected = { comments_count: 3 };
      vi.mocked(mockCommentService.deleteComment!).mockResolvedValue(expected);

      const result = await facade.deleteComment(123, 501);

      expect(mockCommentService.deleteComment).toHaveBeenCalledWith(123, 501);
      expect(result).toEqual(expected);
    });
  });

  describe('Page Access Methods', () => {
    it('должен вызвать pageAccessService.createPageAccess', async () => {
      const expected = createPageAccessFixture();
      vi.mocked(mockPageAccessService.createPageAccess!).mockResolvedValue(expected);

      const data = { role: 'reader' as const, user: { uid: 'u1' } };
      const result = await facade.createPageAccess(123, data);

      expect(mockPageAccessService.createPageAccess).toHaveBeenCalledWith(123, data);
      expect(result).toEqual(expected);
    });

    it('должен вызвать pageAccessService.updatePageAccess', async () => {
      const expected = createPageAccessFixture();
      vi.mocked(mockPageAccessService.updatePageAccess!).mockResolvedValue(expected);

      const params = { idx: 123, access_id: 'a1', data: { role: 'editor' as const } };
      const result = await facade.updatePageAccess(params);

      expect(mockPageAccessService.updatePageAccess).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('должен вызвать pageAccessService.deletePageAccess', async () => {
      vi.mocked(mockPageAccessService.deletePageAccess!).mockResolvedValue(undefined);

      const params = { idx: 123, access_id: 'a1' };
      await facade.deletePageAccess(params);

      expect(mockPageAccessService.deletePageAccess).toHaveBeenCalledWith(params);
    });

    it('должен вызвать pageAccessService.deleteAllPageAccesses', async () => {
      vi.mocked(mockPageAccessService.deleteAllPageAccesses!).mockResolvedValue(undefined);

      const params = { idx: 123 };
      await facade.deleteAllPageAccesses(params);

      expect(mockPageAccessService.deleteAllPageAccesses).toHaveBeenCalledWith(params);
    });
  });

  describe('Attachment Methods', () => {
    it('должен вызвать attachmentService.uploadAttachment', async () => {
      const expected = { id: 1, name: 'x.txt' };
      vi.mocked(mockAttachmentService.uploadAttachment!).mockResolvedValue(expected);

      const params = { idx: 123, filename: 'x.txt', file: Buffer.from('x') };
      const result = await facade.uploadAttachment(params);

      expect(mockAttachmentService.uploadAttachment).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('должен вызвать attachmentService.downloadAttachment', async () => {
      const expected = { content: Buffer.from('x') };
      vi.mocked(mockAttachmentService.downloadAttachment!).mockResolvedValue(expected);

      const result = await facade.downloadAttachment(123, 456);

      expect(mockAttachmentService.downloadAttachment).toHaveBeenCalledWith(123, 456);
      expect(result).toEqual(expected);
    });
  });
});
