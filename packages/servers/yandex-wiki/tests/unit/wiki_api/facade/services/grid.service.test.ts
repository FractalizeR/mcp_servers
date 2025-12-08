// tests/unit/wiki_api/facade/services/grid.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridService } from '../../../../../src/wiki_api/facade/services/grid.service.js';
import type { GridCrudOperationsContainer } from '../../../../../src/wiki_api/facade/services/containers/grid-crud-operations.container.js';
import type { GridDataOperationsContainer } from '../../../../../src/wiki_api/facade/services/containers/grid-data-operations.container.js';

// Grid fixture
function createGridFixture() {
  return {
    id: 'grid-123',
    title: 'Test Grid',
    columns: [],
    rows: [],
  };
}

describe('GridService', () => {
  let gridService: GridService;
  let mockCrudOps: GridCrudOperationsContainer;
  let mockDataOps: GridDataOperationsContainer;

  beforeEach(() => {
    mockCrudOps = {
      create: { execute: vi.fn() },
      get: { execute: vi.fn() },
      update: { execute: vi.fn() },
      remove: { execute: vi.fn() },
    } as unknown as GridCrudOperationsContainer;

    mockDataOps = {
      addRows: { execute: vi.fn() },
      removeRows: { execute: vi.fn() },
      addColumns: { execute: vi.fn() },
      removeColumns: { execute: vi.fn() },
      updateCells: { execute: vi.fn() },
      moveRows: { execute: vi.fn() },
      moveColumns: { execute: vi.fn() },
      clone: { execute: vi.fn() },
    } as unknown as GridDataOperationsContainer;

    gridService = new GridService(mockCrudOps, mockDataOps);
  });

  describe('createGrid', () => {
    it('должен делегировать вызов CreateGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockCrudOps.create.execute).mockResolvedValue(mockGrid);

      const data = { title: 'New Grid', columns: [] };
      const result = await gridService.createGrid(data);

      expect(mockCrudOps.create.execute).toHaveBeenCalledWith(data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('getGrid', () => {
    it('должен делегировать вызов GetGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockCrudOps.get.execute).mockResolvedValue(mockGrid);

      const params = { idx: 'grid-123' };
      const result = await gridService.getGrid(params);

      expect(mockCrudOps.get.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockGrid);
    });
  });

  describe('updateGrid', () => {
    it('должен делегировать вызов UpdateGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockCrudOps.update.execute).mockResolvedValue(mockGrid);

      const data = { title: 'Updated Grid' };
      const result = await gridService.updateGrid('grid-123', data);

      expect(mockCrudOps.update.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('deleteGrid', () => {
    it('должен делегировать вызов DeleteGridOperation', async () => {
      const mockResult = { success: true };
      vi.mocked(mockCrudOps.remove.execute).mockResolvedValue(mockResult);

      const result = await gridService.deleteGrid('grid-123');

      expect(mockCrudOps.remove.execute).toHaveBeenCalledWith('grid-123');
      expect(result).toBe(mockResult);
    });
  });

  describe('addRows', () => {
    it('должен делегировать вызов AddRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.addRows.execute).mockResolvedValue(mockGrid);

      const data = { rows: [{ cells: [] }] };
      const result = await gridService.addRows('grid-123', data);

      expect(mockDataOps.addRows.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('removeRows', () => {
    it('должен делегировать вызов RemoveRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.removeRows.execute).mockResolvedValue(mockGrid);

      const data = { rowIds: ['row-1', 'row-2'] };
      const result = await gridService.removeRows('grid-123', data);

      expect(mockDataOps.removeRows.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('addColumns', () => {
    it('должен делегировать вызов AddColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.addColumns.execute).mockResolvedValue(mockGrid);

      const data = { columns: [{ name: 'New Column' }] };
      const result = await gridService.addColumns('grid-123', data);

      expect(mockDataOps.addColumns.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('removeColumns', () => {
    it('должен делегировать вызов RemoveColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.removeColumns.execute).mockResolvedValue(mockGrid);

      const data = { columnIds: ['col-1'] };
      const result = await gridService.removeColumns('grid-123', data);

      expect(mockDataOps.removeColumns.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('updateCells', () => {
    it('должен делегировать вызов UpdateCellsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.updateCells.execute).mockResolvedValue(mockGrid);

      const data = { cells: [{ rowId: 'row-1', columnId: 'col-1', value: 'new value' }] };
      const result = await gridService.updateCells('grid-123', data);

      expect(mockDataOps.updateCells.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('moveRows', () => {
    it('должен делегировать вызов MoveRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.moveRows.execute).mockResolvedValue(mockGrid);

      const data = { rowId: 'row-1', afterRowId: 'row-2' };
      const result = await gridService.moveRows('grid-123', data);

      expect(mockDataOps.moveRows.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('moveColumns', () => {
    it('должен делегировать вызов MoveColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockDataOps.moveColumns.execute).mockResolvedValue(mockGrid);

      const data = { columnId: 'col-1', afterColumnId: 'col-2' };
      const result = await gridService.moveColumns('grid-123', data);

      expect(mockDataOps.moveColumns.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('cloneGrid', () => {
    it('должен делегировать вызов CloneGridOperation', async () => {
      const mockAsyncOp = { status: 'in_progress', id: 'op-123' };
      vi.mocked(mockDataOps.clone.execute).mockResolvedValue(mockAsyncOp);

      const data = { targetSlug: 'cloned-grid' };
      const result = await gridService.cloneGrid('grid-123', data);

      expect(mockDataOps.clone.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockAsyncOp);
    });
  });
});
