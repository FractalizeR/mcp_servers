/**
 * Unit тесты для RawApiRequestTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RawApiRequestTool } from '#tools/api/raw/raw-api-request.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { getTextContent } from '#helpers/tool-result.helper.js';

interface ParsedResult {
  success: boolean;
  data?: { method: string; path: string; data: unknown };
  message?: string;
  warnings?: unknown[];
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

      const parsed = parse(getTextContent(result));
      expect(parsed.success).toBe(true);
      expect(parsed.data?.data).toEqual({ key: 'QUEUE-1', summary: 'Test' });
      // Boundary case (план plan_tool_contract_unification, 1.1): raw_api_request
      // не гоняет ответ через детектор FIELDS_WITHOUT_VALUE — форма data заранее
      // не известна (объект/массив/скаляр).
      expect(parsed.warnings).toBeUndefined();
    });

    it('не должен выдавать предупреждений, даже если запрошенное поле отсутствует в ответе', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({ key: 'QUEUE-1' });

      const result = await tool.execute({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        fields: ['key', 'totallyBogusField'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = parse(getTextContent(result));
      expect(parsed.warnings).toBeUndefined();
    });

    it('не должен выдавать предупреждений для скалярного ответа API', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue(42);

      const result = await tool.execute({
        method: 'GET',
        path: '/v3/myself',
        fields: ['login'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = parse(getTextContent(result));
      expect(parsed.data?.data).toBe(42);
      expect(parsed.warnings).toBeUndefined();
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
      const parsed = parse(getTextContent(result));
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Ошибка raw API запроса');
    });
  });
});
