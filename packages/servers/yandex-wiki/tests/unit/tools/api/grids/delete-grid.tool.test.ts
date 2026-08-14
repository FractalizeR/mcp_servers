// tests/unit/tools/api/grids/delete-grid.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteGridTool } from '../../../../../src/tools/api/grids/delete/delete-grid.tool.js';
import { DELETE_GRID_TOOL_METADATA } from '../../../../../src/tools/api/grids/delete/delete-grid.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createDeleteGridResultFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('DeleteGridTool', () => {
  let tool: DeleteGridTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const gridId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new DeleteGridTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(DeleteGridTool.METADATA).toBe(DELETE_GRID_TOOL_METADATA);
      expect(DeleteGridTool.METADATA.name).toBe('yw_delete_grid');
    });
  });

  describe('execute', () => {
    it('должен удалить таблицу', async () => {
      vi.mocked(mockFacade.deleteGrid!).mockResolvedValue(createDeleteGridResultFixture());

      const result = await tool.execute({ idx: gridId });

      expect(mockFacade.deleteGrid).toHaveBeenCalledWith(gridId);
      expect(result.isError).toBeFalsy();
    });

    // Дефект 7.1.B №3: тип DeleteGridResult заявлял обязательный
    // recovery_token, которого API не возвращает (проверено живым запросом,
    // см. inventory/table5-wiki-api-coverage.md) — инструмент подставлял
    // result.recovery_token === undefined и молча обещал обратимость удаления.
    it('НЕ должен обещать recovery_token, которого нет в ответе API', async () => {
      vi.mocked(mockFacade.deleteGrid!).mockResolvedValue(createDeleteGridResultFixture());

      const result = await tool.execute({ idx: gridId });

      const payload = result.structuredContent as { data: Record<string, unknown> };
      expect('recovery_token' in payload.data).toBe(false);
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.deleteGrid!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: gridId });

      expect(result.isError).toBe(true);
    });
  });
});
