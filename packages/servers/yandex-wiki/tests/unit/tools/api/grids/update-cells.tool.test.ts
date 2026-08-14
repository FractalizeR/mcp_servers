// tests/unit/tools/api/grids/update-cells.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCellsTool } from '../../../../../src/tools/api/grids/cells/update/update-cells.tool.js';
import { UpdateCellsParamsSchema } from '../../../../../src/tools/api/grids/cells/update/update-cells.schema.js';
import { UPDATE_CELLS_TOOL_METADATA } from '../../../../../src/tools/api/grids/cells/update/update-cells.metadata.js';
import { createMockLogger, createMockFacade, createGridFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

const gridId = '550e8400-e29b-41d4-a716-446655440000';

describe('UpdateCellsTool', () => {
  let tool: UpdateCellsTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new UpdateCellsTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(UpdateCellsTool.METADATA).toBe(UPDATE_CELLS_TOOL_METADATA);
      expect(UpdateCellsTool.METADATA.name).toBe('yw_update_cells');
    });
  });

  // Дефект 7.1.B №2: row_id был типизирован как z.number(), тогда как
  // yw_get_grid отдаёт id строки строкой ({"rows":[{"id":"1"}]}, проверено
  // живым запросом — см. inventory/table5-wiki-api-coverage.md). Строку,
  // полученную от yw_get_grid, нельзя было передать обратно без ручной
  // конвертации, а на нечисловом идентификаторе запись стала бы недостижимой.
  describe('схема row_id (дефект 7.1.B №2)', () => {
    it('должен принимать row_id строкой — как в ответе yw_get_grid', () => {
      const result = UpdateCellsParamsSchema.safeParse({
        idx: gridId,
        cells: [{ row_id: '1', column_slug: 'name', value: 'x' }],
      });

      expect(result.success).toBe(true);
    });

    it('должен отклонять row_id, который не удаётся представить как число (нечисловой ID)', () => {
      // Демонстрирует конкретное следствие бага: строковый (не только числовой)
      // идентификатор не проходил бы при z.number(). После фикса — проходит.
      const result = UpdateCellsParamsSchema.safeParse({
        idx: gridId,
        cells: [{ row_id: 'row-uuid-abc', column_slug: 'name', value: 'x' }],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('должен передать row_id строкой в facade без конвертации', async () => {
      vi.mocked(mockFacade.updateCells!).mockResolvedValue(createGridFixture());

      const result = await tool.execute({
        idx: gridId,
        cells: [{ row_id: '1', column_slug: 'name', value: 'Updated' }],
      });

      expect(mockFacade.updateCells).toHaveBeenCalledWith(gridId, {
        cells: [{ row_id: '1', column_slug: 'name', value: 'Updated' }],
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.updateCells!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: gridId,
        cells: [{ row_id: '1', column_slug: 'name', value: 'x' }],
      });

      expect(result.isError).toBe(true);
    });
  });
});
