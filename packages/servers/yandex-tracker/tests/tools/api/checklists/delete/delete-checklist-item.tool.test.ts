/**
 * Unit тесты для DeleteChecklistItemTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteChecklistItemTool } from '@tools/api/checklists/delete/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('DeleteChecklistItemTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteChecklistItemTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteChecklistItem: vi.fn(),
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

      expect(definition.description).toContain('элемент');
      expect(definition.description).toContain('чеклист');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'checklistItemId']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['checklistItemId']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ checklistItemId: 'item-123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр checklistItemId', async () => {
      const result = await tool.execute({ issueId: 'TEST-123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({ issueId: '', checklistItemId: 'item-123' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой checklistItemId', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', checklistItemId: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockResolvedValue();

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteChecklistItem с параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockResolvedValue();

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(mockTrackerFacade.deleteChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123');
    });

    it('должен вернуть успешный результат', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockResolvedValue();

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          message: string;
          itemId: string;
          issueId: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.itemId).toBe('item-123');
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.message).toContain('item-123');
      expect(parsed.data.message).toContain('TEST-123');
      expect(parsed.data.message).toContain('успешно удалён');
    });
  });

  describe('Logging', () => {
    it('должен логировать начало удаления элемента', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockResolvedValue();

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление элемента из чеклиста задачи',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemId: 'item-123',
        })
      );
    });

    it('должен логировать успешное удаление', async () => {
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockResolvedValue();

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент успешно удалён из чеклиста',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemId: 'item-123',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении элемента');
      expect(result.content[0]?.text).toContain('item-123');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        checklistItemId: 'item-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении элемента');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку несуществующего элемента (404)', async () => {
      const notFoundError = new Error('Checklist item not found');
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'nonexistent-item',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении элемента');
      expect(result.content[0]?.text).toContain('nonexistent-item');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.deleteChecklistItem).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        checklistItemId: 'item-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении элемента');
    });
  });
});
