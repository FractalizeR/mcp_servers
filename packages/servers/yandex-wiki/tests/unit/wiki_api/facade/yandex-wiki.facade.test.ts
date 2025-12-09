// tests/unit/wiki_api/facade/yandex-wiki.facade.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import type { PageService, GridService, ResourceService } from '#wiki_api/facade/services/index.js';
import {
  createPageFixture,
  createGridFixture,
  createDeleteResultFixture,
  createDeleteGridResultFixture,
  createAsyncOperationFixture,
  createResourcesResponseFixture,
} from '#helpers/index.js';

describe('YandexWikiFacade', () => {
  let facade: YandexWikiFacade;
  let mockPageService: Partial<PageService>;
  let mockGridService: Partial<GridService>;
  let mockResourceService: Partial<ResourceService>;

  beforeEach(() => {
    mockPageService = {
      getPage: vi.fn(),
      getPageById: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
      deletePage: vi.fn(),
      clonePage: vi.fn(),
      appendContent: vi.fn(),
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

    facade = new YandexWikiFacade(
      mockPageService as PageService,
      mockGridService as GridService,
      mockResourceService as ResourceService
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

      const result = await facade.deletePage(123);

      expect(mockPageService.deletePage).toHaveBeenCalledWith(123);
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
  });

  describe('Grid Methods', () => {
    it('должен вызвать gridService.createGrid', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.createGrid!).mockResolvedValue(expectedGrid);

      const data = {
        title: 'New Grid',
        page: 'users/test',
        columns: [],
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

      const result = await facade.updateGrid('grid-123', { title: 'Updated' });

      expect(mockGridService.updateGrid).toHaveBeenCalledWith('grid-123', { title: 'Updated' });
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

      const data = { row_ids: ['row-1'], after_row_id: 'row-5' };
      const result = await facade.moveRows('grid-123', data);

      expect(mockGridService.moveRows).toHaveBeenCalledWith('grid-123', data);
      expect(result).toEqual(expectedGrid);
    });

    it('должен вызвать gridService.moveColumns', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockGridService.moveColumns!).mockResolvedValue(expectedGrid);

      const data = { column_slugs: ['col1'], after_column_slug: 'col5' };
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
});
