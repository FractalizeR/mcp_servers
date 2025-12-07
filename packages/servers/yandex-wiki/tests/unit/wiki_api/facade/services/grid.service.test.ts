// tests/unit/wiki_api/facade/services/grid.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridService } from '../../../../../src/wiki_api/facade/services/grid.service.js';
import type {
  CreateGridOperation,
  GetGridOperation,
  UpdateGridOperation,
  DeleteGridOperation,
  AddRowsOperation,
  RemoveRowsOperation,
  AddColumnsOperation,
  RemoveColumnsOperation,
  UpdateCellsOperation,
  MoveRowsOperation,
  MoveColumnsOperation,
  CloneGridOperation,
} from '../../../../../src/wiki_api/api_operations/index.js';

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
  let mockCreateGridOp: CreateGridOperation;
  let mockGetGridOp: GetGridOperation;
  let mockUpdateGridOp: UpdateGridOperation;
  let mockDeleteGridOp: DeleteGridOperation;
  let mockAddRowsOp: AddRowsOperation;
  let mockRemoveRowsOp: RemoveRowsOperation;
  let mockAddColumnsOp: AddColumnsOperation;
  let mockRemoveColumnsOp: RemoveColumnsOperation;
  let mockUpdateCellsOp: UpdateCellsOperation;
  let mockMoveRowsOp: MoveRowsOperation;
  let mockMoveColumnsOp: MoveColumnsOperation;
  let mockCloneGridOp: CloneGridOperation;

  beforeEach(() => {
    mockCreateGridOp = { execute: vi.fn() } as unknown as CreateGridOperation;
    mockGetGridOp = { execute: vi.fn() } as unknown as GetGridOperation;
    mockUpdateGridOp = { execute: vi.fn() } as unknown as UpdateGridOperation;
    mockDeleteGridOp = { execute: vi.fn() } as unknown as DeleteGridOperation;
    mockAddRowsOp = { execute: vi.fn() } as unknown as AddRowsOperation;
    mockRemoveRowsOp = { execute: vi.fn() } as unknown as RemoveRowsOperation;
    mockAddColumnsOp = { execute: vi.fn() } as unknown as AddColumnsOperation;
    mockRemoveColumnsOp = { execute: vi.fn() } as unknown as RemoveColumnsOperation;
    mockUpdateCellsOp = { execute: vi.fn() } as unknown as UpdateCellsOperation;
    mockMoveRowsOp = { execute: vi.fn() } as unknown as MoveRowsOperation;
    mockMoveColumnsOp = { execute: vi.fn() } as unknown as MoveColumnsOperation;
    mockCloneGridOp = { execute: vi.fn() } as unknown as CloneGridOperation;

    gridService = new GridService(
      mockCreateGridOp,
      mockGetGridOp,
      mockUpdateGridOp,
      mockDeleteGridOp,
      mockAddRowsOp,
      mockRemoveRowsOp,
      mockAddColumnsOp,
      mockRemoveColumnsOp,
      mockUpdateCellsOp,
      mockMoveRowsOp,
      mockMoveColumnsOp,
      mockCloneGridOp
    );
  });

  describe('createGrid', () => {
    it('должен делегировать вызов CreateGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockCreateGridOp.execute).mockResolvedValue(mockGrid);

      const data = { title: 'New Grid', columns: [] };
      const result = await gridService.createGrid(data);

      expect(mockCreateGridOp.execute).toHaveBeenCalledWith(data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('getGrid', () => {
    it('должен делегировать вызов GetGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockGetGridOp.execute).mockResolvedValue(mockGrid);

      const params = { idx: 'grid-123' };
      const result = await gridService.getGrid(params);

      expect(mockGetGridOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockGrid);
    });
  });

  describe('updateGrid', () => {
    it('должен делегировать вызов UpdateGridOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockUpdateGridOp.execute).mockResolvedValue(mockGrid);

      const data = { title: 'Updated Grid' };
      const result = await gridService.updateGrid('grid-123', data);

      expect(mockUpdateGridOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('deleteGrid', () => {
    it('должен делегировать вызов DeleteGridOperation', async () => {
      const mockResult = { success: true };
      vi.mocked(mockDeleteGridOp.execute).mockResolvedValue(mockResult);

      const result = await gridService.deleteGrid('grid-123');

      expect(mockDeleteGridOp.execute).toHaveBeenCalledWith('grid-123');
      expect(result).toBe(mockResult);
    });
  });

  describe('addRows', () => {
    it('должен делегировать вызов AddRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockAddRowsOp.execute).mockResolvedValue(mockGrid);

      const data = { rows: [{ cells: [] }] };
      const result = await gridService.addRows('grid-123', data);

      expect(mockAddRowsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('removeRows', () => {
    it('должен делегировать вызов RemoveRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockRemoveRowsOp.execute).mockResolvedValue(mockGrid);

      const data = { rowIds: ['row-1', 'row-2'] };
      const result = await gridService.removeRows('grid-123', data);

      expect(mockRemoveRowsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('addColumns', () => {
    it('должен делегировать вызов AddColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockAddColumnsOp.execute).mockResolvedValue(mockGrid);

      const data = { columns: [{ name: 'New Column' }] };
      const result = await gridService.addColumns('grid-123', data);

      expect(mockAddColumnsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('removeColumns', () => {
    it('должен делегировать вызов RemoveColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockRemoveColumnsOp.execute).mockResolvedValue(mockGrid);

      const data = { columnIds: ['col-1'] };
      const result = await gridService.removeColumns('grid-123', data);

      expect(mockRemoveColumnsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('updateCells', () => {
    it('должен делегировать вызов UpdateCellsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockUpdateCellsOp.execute).mockResolvedValue(mockGrid);

      const data = { cells: [{ rowId: 'row-1', columnId: 'col-1', value: 'new value' }] };
      const result = await gridService.updateCells('grid-123', data);

      expect(mockUpdateCellsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('moveRows', () => {
    it('должен делегировать вызов MoveRowsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockMoveRowsOp.execute).mockResolvedValue(mockGrid);

      const data = { rowId: 'row-1', afterRowId: 'row-2' };
      const result = await gridService.moveRows('grid-123', data);

      expect(mockMoveRowsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('moveColumns', () => {
    it('должен делегировать вызов MoveColumnsOperation', async () => {
      const mockGrid = createGridFixture();
      vi.mocked(mockMoveColumnsOp.execute).mockResolvedValue(mockGrid);

      const data = { columnId: 'col-1', afterColumnId: 'col-2' };
      const result = await gridService.moveColumns('grid-123', data);

      expect(mockMoveColumnsOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockGrid);
    });
  });

  describe('cloneGrid', () => {
    it('должен делегировать вызов CloneGridOperation', async () => {
      const mockAsyncOp = { status: 'in_progress', id: 'op-123' };
      vi.mocked(mockCloneGridOp.execute).mockResolvedValue(mockAsyncOp);

      const data = { targetSlug: 'cloned-grid' };
      const result = await gridService.cloneGrid('grid-123', data);

      expect(mockCloneGridOp.execute).toHaveBeenCalledWith('grid-123', data);
      expect(result).toBe(mockAsyncOp);
    });
  });
});
