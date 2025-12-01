/**
 * Unit тесты для DeleteChecklistItemTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteChecklistItemTool } from '#tools/api/checklists/delete/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DeleteChecklistItemTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteChecklistItemTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteChecklistItemMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteChecklistItemTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_delete_checklist_item', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_checklist_item', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(DeleteChecklistItemTool.METADATA.category).toBe('checklists');
      expect(DeleteChecklistItemTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Удалить элементы');
      expect(definition.description).toContain('batch');
    });

    it('должен иметь корректную схему с массивом items', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['items']);
      expect(definition.inputSchema.properties?.['items']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать массив items', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив items', async () => {
      const result = await tool.execute({ items: [] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен отклонить пустой itemId', async () => {
      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: '' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('itemId');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
      ]);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'item-123' }],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteChecklistItemMany с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
      ]);

      await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'item-123' }],
      });

      expect(mockTrackerFacade.deleteChecklistItemMany).toHaveBeenCalledWith([
        { issueId: 'TEST-123', itemId: 'item-123' },
      ]);
    });

    it('должен вернуть успешный результат для batch операции', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
        { status: 'fulfilled', key: 'TEST-456/item-456', value: undefined },
      ]);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', itemId: 'item-123' },
          { issueId: 'TEST-456', itemId: 'item-456' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{ issueId: string; itemId: string; success: boolean }>;
          errors: Array<{ issueId: string; itemId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(2);
      expect(parsed.data.failed).toBe(0);
      expect(parsed.data.items).toHaveLength(2);
      expect(parsed.data.errors).toHaveLength(0);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало удаления', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
      ]);

      await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'item-123' }],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Удаление элементов из чеклистов'),
        expect.any(Object)
      );
    });

    it('должен логировать результаты', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
      ]);

      await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'item-123' }],
      });

      // ResultLogger.logBatchResults вызывает info с сообщением о результатах
      expect(mockLogger.info).toHaveBeenCalled();
      // Первый вызов - logOperationStart с "Удаление элементов из чеклистов: N"
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Удаление элементов из чеклистов'),
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать частичные ошибки в batch', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123/item-123', value: undefined },
        { status: 'rejected', key: 'TEST-456/item-456', reason: new Error('Item not found') },
      ]);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', itemId: 'item-123' },
          { issueId: 'TEST-456', itemId: 'item-456' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{ issueId: string; itemId: string; success: boolean }>;
          errors: Array<{ issueId: string; itemId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(1);
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].issueId).toBe('TEST-456');
      expect(parsed.data.errors[0].itemId).toBe('item-456');
      expect(parsed.data.errors[0].error).toContain('Item not found');
    });

    it('должен обработать полную ошибку batch', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockRejectedValue(error);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'item-123' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении элементов');
    });

    it('должен обработать ошибку несуществующего элемента (404)', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        {
          status: 'rejected',
          key: 'TEST-123/NONEXISTENT',
          reason: new Error('Checklist item not found'),
        },
      ]);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', itemId: 'NONEXISTENT' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          errors: Array<{ issueId: string; itemId: string; error: string }>;
        };
      };
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].error).toContain('Checklist item not found');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        { status: 'rejected', key: 'PRIVATE-123/item-123', reason: new Error('Access denied') },
      ]);

      const result = await tool.execute({
        items: [{ issueId: 'PRIVATE-123', itemId: 'item-123' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          errors: Array<{ issueId: string; itemId: string; error: string }>;
        };
      };
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].error).toContain('Access denied');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItemMany).mockResolvedValue([
        {
          status: 'rejected',
          key: 'NONEXISTENT-999/item-123',
          reason: new Error('Issue not found'),
        },
      ]);

      const result = await tool.execute({
        items: [{ issueId: 'NONEXISTENT-999', itemId: 'item-123' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          errors: Array<{ issueId: string; itemId: string; error: string }>;
        };
      };
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].error).toContain('Issue not found');
    });
  });
});
