/**
 * Unit тесты для RawApiRequestTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RawApiRequestTool } from '#tools/api/raw/raw-api-request.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

interface ParsedResult {
  success: boolean;
  data?: { method: string; path: string; data: unknown; fieldsReturned: string[] };
  message?: string;
}

describe('RawApiRequestTool', () => {
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: RawApiRequestTool;

  beforeEach(() => {
    mockFacade = {
      rawApiRequest: vi.fn(),
    } as unknown as YandexTrackerFacade;

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
        key: 'QUEUE-1',
        summary: 'Test',
        description: 'skip me',
      });

      const result = await tool.execute({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: 'transitions' },
        fields: ['key', 'summary'],
      });

      expect(result.isError).toBeUndefined();
      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: 'transitions' },
      });

      const parsed = parse(result.content[0]?.text);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.data).toEqual({ key: 'QUEUE-1', summary: 'Test' });
      expect(parsed.data?.fieldsReturned).toEqual(['key', 'summary']);
    });

    it('должен передавать input без query, если query не задан', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({ key: 'QUEUE-2' });

      await tool.execute({ method: 'GET', path: '/v2/projects', fields: ['key'] });

      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v2/projects',
      });
    });

    it('должен вернуть ошибку валидации при неверном пути', async () => {
      const result = await tool.execute({ method: 'GET', path: '/bad', fields: ['key'] });

      expect(result.isError).toBe(true);
      expect(mockFacade.rawApiRequest).not.toHaveBeenCalled();
    });

    it('должен обработать ошибку facade', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockRejectedValue(new Error('API down'));

      const result = await tool.execute({
        method: 'GET',
        path: '/v3/myself',
        fields: ['login'],
      });

      expect(result.isError).toBe(true);
      const parsed = parse(result.content[0]?.text);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Ошибка raw API запроса');
    });
  });
});
