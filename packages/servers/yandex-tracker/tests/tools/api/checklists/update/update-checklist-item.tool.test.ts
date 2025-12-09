/**
 * Unit тесты для UpdateChecklistItemTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateChecklistItemTool } from '#tools/api/checklists/update/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createChecklistItemFixture } from '#helpers/checklist-item.fixture.js';

describe('UpdateChecklistItemTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateChecklistItemTool;

  const mockChecklistItem: ChecklistItemWithUnknownFields = createChecklistItemFixture({
    id: 'item-12345',
    text: 'Updated item',
    checked: true,
  });

  beforeEach(() => {
    mockTrackerFacade = {
      updateChecklistItemMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateChecklistItemTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_update_checklist_item', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('update_checklist_item', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(UpdateChecklistItemTool.METADATA.category).toBe('checklists');
      expect(UpdateChecklistItemTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь batch тег в метаданных', () => {
      expect(UpdateChecklistItemTool.METADATA.tags).toContain('batch');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Обновить элементы');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['items', 'fields']);
      expect(definition.inputSchema.properties?.['items']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр items', async () => {
      const result = await tool.execute({ fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр fields', async () => {
      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Updated' }],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив items', async () => {
      const result = await tool.execute({ items: [], fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой issueId в элементе', async () => {
      const result = await tool.execute({
        items: [{ issueId: '', checklistItemId: 'item-1', text: 'Test' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой checklistItemId в элементе', async () => {
      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: '', text: 'Test' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', checked: true }],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать updateChecklistItemMany с минимальными параметрами', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1' }],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.updateChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          checklistItemId: 'item-1',
          text: undefined,
          checked: undefined,
          assignee: undefined,
          deadline: undefined,
        },
      ]);
    });

    it('должен вызвать updateChecklistItemMany с несколькими элементами', async () => {
      const mockItem2 = createChecklistItemFixture({ id: 'item-2', text: 'Item 2', checked: true });
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
        { status: 'fulfilled', key: 'TEST-456/item-2', value: mockItem2 },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [
          { issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Updated' },
          { issueId: 'TEST-456', checklistItemId: 'item-2', checked: true },
        ],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.updateChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          checklistItemId: 'item-1',
          text: 'Updated',
          checked: undefined,
          assignee: undefined,
          deadline: undefined,
        },
        {
          issueId: 'TEST-456',
          checklistItemId: 'item-2',
          text: undefined,
          checked: true,
          assignee: undefined,
          deadline: undefined,
        },
      ]);
    });

    it('должен вызвать updateChecklistItemMany со всеми параметрами', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [
          {
            issueId: 'TEST-123',
            checklistItemId: 'item-1',
            text: 'Updated text',
            checked: true,
            assignee: 'user123',
            deadline: '2025-12-31T23:59:59.000Z',
          },
        ],
        fields: ['id', 'text', 'checked', 'assignee', 'deadline'],
      });

      expect(mockTrackerFacade.updateChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          checklistItemId: 'item-1',
          text: 'Updated text',
          checked: true,
          assignee: 'user123',
          deadline: '2025-12-31T23:59:59.000Z',
        },
      ]);
    });

    it('должен вернуть обновлённые элементы', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', checked: true }],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{
            issueId: string;
            checklistItemId: string;
            item: ChecklistItemWithUnknownFields;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(0);
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.items[0].issueId).toBe('TEST-123');
      expect(parsed.data.items[0].checklistItemId).toBe('item-1');
    });

    it('должен вернуть несколько обновлённых элементов', async () => {
      const mockItem2 = createChecklistItemFixture({ id: 'item-2', text: 'Item 2', checked: true });
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
        { status: 'fulfilled', key: 'TEST-456/item-2', value: mockItem2 },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Updated' },
          { issueId: 'TEST-456', checklistItemId: 'item-2', checked: true },
        ],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{ issueId: string; checklistItemId: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(2);
      expect(parsed.data.items).toHaveLength(2);
    });
  });

  describe('Partial failures', () => {
    it('должен обработать частичные ошибки', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
        { status: 'rejected', key: 'TEST-456/item-2', reason: new Error('Item not found') },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Updated' },
          { issueId: 'TEST-456', checklistItemId: 'item-2', text: 'Should fail' },
        ],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{ issueId: string; checklistItemId: string }>;
          errors: Array<{ issueId: string; checklistItemId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(1);
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.items[0].issueId).toBe('TEST-123');
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].issueId).toBe('TEST-456');
      expect(parsed.data.errors[0].error).toContain('Item not found');
    });

    it('должен обработать полный провал batch операции', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'rejected', key: 'TEST-123/item-1', reason: new Error('API Error') },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Test' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          items: Array<{ issueId: string }>;
          errors: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toBe(0);
      expect(parsed.data.failed).toBe(1);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало обновления элементов', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', checked: true }],
        fields: ['id', 'text'],
      });

      // ResultLogger.logOperationStart логирует "operationName: count"
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элементов чеклистов: 1',
        expect.objectContaining({
          itemsCount: 1,
          fields: 2,
        })
      );
    });

    it('должен логировать успешное обновление', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123/item-1', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', checked: true }],
        fields: ['id', 'text', 'checked'],
      });

      // ResultLogger.logBatchResults логирует в debug
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Элементы чеклистов обновлены'),
        expect.objectContaining({
          successful: 1,
          failed: 0,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать критические ошибки от operation', async () => {
      const error = new Error('Network Error');
      vi.mocked(mockTrackerFacade.updateChecklistItemMany).mockRejectedValue(error);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', checklistItemId: 'item-1', text: 'Test' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении элементов чеклистов');
    });
  });
});
