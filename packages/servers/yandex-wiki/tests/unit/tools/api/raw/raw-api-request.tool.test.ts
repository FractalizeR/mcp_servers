/**
 * Unit тесты для RawApiRequestTool (Yandex Wiki)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RawApiRequestTool } from '#tools/api/raw/raw-api-request.tool.js';
import type { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

interface ParsedResult {
  success: boolean;
  data?: { method: string; path: string; data: unknown; fieldsReturned: string[] };
  message?: string;
}

describe('RawApiRequestTool (wiki)', () => {
  let mockFacade: YandexWikiFacade;
  let mockLogger: Logger;
  let tool: RawApiRequestTool;

  beforeEach(() => {
    mockFacade = {
      rawApiRequest: vi.fn(),
    } as unknown as YandexWikiFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new RawApiRequestTool(mockFacade, mockLogger);
  });

  const parse = (text?: string): ParsedResult => JSON.parse(text ?? '{}') as ParsedResult;

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const def = tool.getDefinition();
      expect(def.name).toBe(buildToolName('raw_api_request', MCP_TOOL_PREFIX));
      expect(def.inputSchema.properties?.['method']).toBeDefined();
      expect(def.inputSchema.properties?.['path']).toBeDefined();
      expect(def.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    it('должен делегировать запрос в facade и отфильтровать ответ по fields', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({
        id: 123,
        title: 'Test',
        content: 'skip me',
      });

      const result = await tool.execute({
        method: 'GET',
        path: '/v1/pages/123',
        query: { fields: 'content' },
        fields: ['id', 'title'],
      });

      expect(result.isError).toBeUndefined();
      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v1/pages/123',
        query: { fields: 'content' },
      });

      const parsed = parse(result.content[0]?.text as string | undefined);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.data).toEqual({ id: 123, title: 'Test' });
      expect(parsed.data?.fieldsReturned).toEqual(['id', 'title']);
    });

    it('должен передавать input без query, если query не задан', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({ id: 456 });

      await tool.execute({ method: 'GET', path: '/v1/pages/456', fields: ['id'] });

      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v1/pages/456',
      });
    });

    it('должен вернуть ошибку валидации при неверном пути', async () => {
      const result = await tool.execute({ method: 'GET', path: '/bad', fields: ['id'] });

      expect(result.isError).toBe(true);
      expect(mockFacade.rawApiRequest).not.toHaveBeenCalled();
    });

    it('должен обработать ошибку facade', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockRejectedValue(new Error('API down'));

      const result = await tool.execute({
        method: 'GET',
        path: '/v1/pages/123',
        fields: ['id'],
      });

      expect(result.isError).toBe(true);
      const parsed = parse(result.content[0]?.text as string | undefined);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Ошибка raw API запроса');
    });
  });
});
