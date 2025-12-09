// tests/unit/tools/api/resources/get-resources.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetResourcesTool } from '../../../../../src/tools/api/resources/get/get-resources.tool.js';
import { GET_RESOURCES_TOOL_METADATA } from '../../../../../src/tools/api/resources/get/get-resources.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createResourcesResponseFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('GetResourcesTool', () => {
  let tool: GetResourcesTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetResourcesTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetResourcesTool.METADATA).toBe(GET_RESOURCES_TOOL_METADATA);
      expect(GetResourcesTool.METADATA.name).toBe('yw_get_resources');
    });
  });

  describe('execute', () => {
    it('должен получить ресурсы с валидными параметрами', async () => {
      const expectedResponse = createResourcesResponseFixture();
      vi.mocked(mockFacade.getResources!).mockResolvedValue(expectedResponse);

      const result = await tool.execute({
        idx: 123,
      });

      expect(mockFacade.getResources).toHaveBeenCalledWith({
        idx: 123,
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required idx
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getResources!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 456,
      });

      expect(result.isError).toBe(true);
    });
  });
});
