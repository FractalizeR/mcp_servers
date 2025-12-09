// tests/unit/tools/api/grids/get-grid.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetGridTool } from '../../../../../src/tools/api/grids/get/get-grid.tool.js';
import { GET_GRID_TOOL_METADATA } from '../../../../../src/tools/api/grids/get/get-grid.metadata.js';
import { createMockFacade, createMockLogger, createGridFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';

describe('GetGridTool', () => {
  let tool: GetGridTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetGridTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetGridTool.METADATA).toBe(GET_GRID_TOOL_METADATA);
      expect(GetGridTool.METADATA.name).toBe('yw_get_grid');
      expect(GetGridTool.METADATA.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('должен получить таблицу с валидными параметрами', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockFacade.getGrid!).mockResolvedValue(expectedGrid);

      const gridId = '550e8400-e29b-41d4-a716-446655440000';
      const result = await tool.execute({
        idx: gridId,
      });

      expect(mockFacade.getGrid).toHaveBeenCalledWith({
        idx: gridId,
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен передавать опциональные параметры', async () => {
      const expectedGrid = createGridFixture();
      vi.mocked(mockFacade.getGrid!).mockResolvedValue(expectedGrid);

      const gridId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      await tool.execute({
        idx: gridId,
        fields: 'title,rows',
        filter: 'status=active',
        only_cols: '1,2,3',
        only_rows: '5,6,7',
        sort: 'created_at',
      });

      expect(mockFacade.getGrid).toHaveBeenCalledWith({
        idx: gridId,
        fields: 'title,rows',
        filter: 'status=active',
        only_cols: '1,2,3',
        only_rows: '5,6,7',
        sort: 'created_at',
      });
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required idx
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getGrid!).mockRejectedValue(new Error('API Error'));

      const gridId = '123e4567-e89b-12d3-a456-426614174000';
      const result = await tool.execute({
        idx: gridId,
      });

      expect(result.isError).toBe(true);
    });
  });
});
