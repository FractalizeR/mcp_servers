// tests/unit/tools/api/pages/get-descendants-by-id.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDescendantsByIdTool } from '../../../../../src/tools/api/pages/descendants-by-id/get-descendants-by-id.tool.js';
import { GET_DESCENDANTS_BY_ID_TOOL_METADATA } from '../../../../../src/tools/api/pages/descendants-by-id/get-descendants-by-id.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createDescendantsResponseFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('GetDescendantsByIdTool', () => {
  let tool: GetDescendantsByIdTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new GetDescendantsByIdTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetDescendantsByIdTool.METADATA).toBe(GET_DESCENDANTS_BY_ID_TOOL_METADATA);
      expect(GetDescendantsByIdTool.METADATA.name).toBe('yw_get_descendants_by_id');
    });
  });

  describe('execute', () => {
    it('должен обойти поддерево по id', async () => {
      const expected = createDescendantsResponseFixture();
      vi.mocked(mockFacade.getDescendantsById!).mockResolvedValue(expected);

      const result = await tool.execute({ idx: 123 });

      expect(mockFacade.getDescendantsById).toHaveBeenCalledWith({ idx: 123 });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (отсутствует idx)', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getDescendantsById!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 456 });

      expect(result.isError).toBe(true);
    });
  });
});
