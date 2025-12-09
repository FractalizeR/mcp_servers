/**
 * Unit тесты для DeleteLinkTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteLinkTool } from '#tools/api/issues/links/delete/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DeleteLinkTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteLinkTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteLinksMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteLinkTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_link', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Удалить связ');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['links']);
      expect(definition.inputSchema.properties?.['links']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр links', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив links', async () => {
      const result = await tool.execute({ links: [] });

      expect(result.isError).toBe(true);
    });

    it('должен отклонить links без issueId', async () => {
      const result = await tool.execute({ links: [{ linkId: 'link123' }] });

      expect(result.isError).toBe(true);
    });

    it('должен отклонить links без linkId', async () => {
      const result = await tool.execute({ links: [{ issueId: 'TEST-123' }] });

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteLinksMany с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteLinksMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:link456', value: undefined },
      ]);

      await tool.execute({
        links: [{ issueId: 'TEST-123', linkId: 'link456' }],
      });

      expect(mockTrackerFacade.deleteLinksMany).toHaveBeenCalledWith([
        { issueId: 'TEST-123', linkId: 'link456' },
      ]);
    });

    it('должен вернуть успешный результат при удалении связи', async () => {
      vi.mocked(mockTrackerFacade.deleteLinksMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:link789', value: undefined },
      ]);

      const result = await tool.execute({
        links: [{ issueId: 'TEST-123', linkId: 'link789' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string; linkId: string; success: boolean }>;
          failed: Array<{ issueId: string; linkId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.successful[0].issueId).toBe('TEST-123');
      expect(parsed.data.successful[0].linkId).toBe('link789');
      expect(parsed.data.successful[0].success).toBe(true);
    });

    it('должен обработать ошибки от facade', async () => {
      const error = new Error('Link deletion failed');
      vi.mocked(mockTrackerFacade.deleteLinksMany).mockResolvedValue([
        { status: 'rejected', key: 'TEST-123:link999', reason: error },
      ]);

      const result = await tool.execute({
        links: [{ issueId: 'TEST-123', linkId: 'link999' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}');
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].error).toContain('Link deletion failed');
    });

    it('должен обработать смешанные результаты (success + failure)', async () => {
      vi.mocked(mockTrackerFacade.deleteLinksMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1:link1', value: undefined },
        { status: 'rejected', key: 'TEST-2:link2', reason: new Error('Not found') },
      ]);

      const result = await tool.execute({
        links: [
          { issueId: 'TEST-1', linkId: 'link1' },
          { issueId: 'TEST-2', linkId: 'link2' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}');
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(1);
    });
  });
});
