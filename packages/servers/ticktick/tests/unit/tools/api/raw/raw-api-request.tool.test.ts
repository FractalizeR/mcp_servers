/**
 * Unit tests for RawApiRequestTool (TickTick)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RawApiRequestTool } from '#tools/api/raw/raw-api-request.tool.js';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createMockLogger } from '#helpers/index.js';

interface ParsedResult {
  success: boolean;
  data?: { method: string; path: string; data: unknown; fieldsReturned: string[] };
  message?: string;
}

describe('RawApiRequestTool (TickTick)', () => {
  let mockFacade: TickTickFacade;
  let tool: RawApiRequestTool;

  beforeEach(() => {
    mockFacade = {
      rawApiRequest: vi.fn(),
    } as unknown as TickTickFacade;

    tool = new RawApiRequestTool(mockFacade, createMockLogger());
  });

  const parse = (text?: string): ParsedResult => JSON.parse(text ?? '{}') as ParsedResult;

  describe('getDefinition', () => {
    it('returns a correct tool definition', () => {
      const def = tool.getDefinition();
      expect(def.name).toBe(buildToolName('raw_api_request', MCP_TOOL_PREFIX));
      expect(def.inputSchema.properties?.['method']).toBeDefined();
      expect(def.inputSchema.properties?.['path']).toBeDefined();
      expect(def.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    it('delegates to facade and filters the response by fields', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({
        id: 'proj-1',
        name: 'Inbox',
        color: 'skip me',
      });

      const result = await tool.execute({
        method: 'GET',
        path: '/project/proj-1/data',
        query: { limit: 50 },
        fields: ['id', 'name'],
      });

      expect(result.isError).toBeUndefined();
      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/project/proj-1/data',
        query: { limit: 50 },
      });

      const parsed = parse(result.content[0]?.text);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.data).toEqual({ id: 'proj-1', name: 'Inbox' });
      expect(parsed.data?.fieldsReturned).toEqual(['id', 'name']);
    });

    it('passes input without query when query is not provided', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({ id: 'proj-2' });

      await tool.execute({ method: 'GET', path: '/project', fields: ['id'] });

      expect(mockFacade.rawApiRequest).toHaveBeenCalledWith({
        method: 'GET',
        path: '/project',
      });
    });

    it('returns a validation error on invalid path', async () => {
      const result = await tool.execute({ method: 'GET', path: 'bad', fields: ['id'] });

      expect(result.isError).toBe(true);
      expect(mockFacade.rawApiRequest).not.toHaveBeenCalled();
    });

    it('handles a facade error', async () => {
      vi.mocked(mockFacade.rawApiRequest).mockRejectedValue(new Error('API down'));

      const result = await tool.execute({
        method: 'GET',
        path: '/project/proj-1',
        fields: ['id'],
      });

      expect(result.isError).toBe(true);
      const parsed = parse(result.content[0]?.text);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('Ошибка raw API запроса');
    });
  });
});
