/**
 * Unit тесты для AddChecklistItemTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddChecklistItemTool } from '#tools/api/checklists/add/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createChecklistItemFixture } from '#helpers/checklist-item.fixture.js';

describe('AddChecklistItemTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: AddChecklistItemTool;

  const mockChecklistItem: ChecklistItemWithUnknownFields = createChecklistItemFixture({
    id: 'item-12345',
    text: 'Test checklist item',
    checked: false,
  });

  beforeEach(() => {
    mockTrackerFacade = {
      addChecklistItemMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new AddChecklistItemTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_add_checklist_item', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('add_checklist_item', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(AddChecklistItemTool.METADATA.category).toBe('checklists');
      expect(AddChecklistItemTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь batch тег в метаданных', () => {
      expect(AddChecklistItemTool.METADATA.tags).toContain('batch');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Добавить элемент');
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
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
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
        items: [{ issueId: '', text: 'Test item' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой text в элементе', async () => {
      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', text: '' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать addChecklistItemMany с минимальными параметрами', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          text: 'Test item',
          checked: undefined,
          assignee: undefined,
          deadline: undefined,
        },
      ]);
    });

    it('должен вызвать addChecklistItemMany с несколькими элементами', async () => {
      const mockItem2 = createChecklistItemFixture({ id: 'item-2', text: 'Item 2', checked: true });
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
        { status: 'fulfilled', key: 'TEST-456', value: mockItem2 },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [
          { issueId: 'TEST-123', text: 'Test item' },
          { issueId: 'TEST-456', text: 'Item 2', checked: true },
        ],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          text: 'Test item',
          checked: undefined,
          assignee: undefined,
          deadline: undefined,
        },
        {
          issueId: 'TEST-456',
          text: 'Item 2',
          checked: true,
          assignee: undefined,
          deadline: undefined,
        },
      ]);
    });

    it('должен вызвать addChecklistItemMany со всеми параметрами', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [
          {
            issueId: 'TEST-123',
            text: 'Test item',
            checked: true,
            assignee: 'user123',
            deadline: '2025-12-31T23:59:59.000Z',
          },
        ],
        fields: ['id', 'text', 'checked', 'assignee', 'deadline'],
      });

      expect(mockTrackerFacade.addChecklistItemMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-123',
          text: 'Test item',
          checked: true,
          assignee: 'user123',
          deadline: '2025-12-31T23:59:59.000Z',
        },
      ]);
    });

    it('должен вернуть добавленные элементы', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
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
            itemId: string;
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
      expect(parsed.data.items[0].itemId).toBe('item-12345');
    });

    it('должен вернуть несколько добавленных элементов', async () => {
      const mockItem2 = createChecklistItemFixture({ id: 'item-2', text: 'Item 2', checked: true });
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
        { status: 'fulfilled', key: 'TEST-456', value: mockItem2 },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', text: 'Test item' },
          { issueId: 'TEST-456', text: 'Item 2', checked: true },
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
          items: Array<{ issueId: string; itemId: string }>;
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
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
        { status: 'rejected', key: 'TEST-456', reason: new Error('Issue not found') },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [
          { issueId: 'TEST-123', text: 'Test item' },
          { issueId: 'TEST-456', text: 'Item 2' },
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
          items: Array<{ issueId: string }>;
          errors: Array<{ issueId: string; error: string }>;
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
      expect(parsed.data.errors[0].error).toContain('Issue not found');
    });

    it('должен обработать полный провал batch операции', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'rejected', key: 'TEST-123', reason: new Error('API Error') },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
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
    it('должен логировать начало добавления элементов', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
        fields: ['id', 'text'],
      });

      // ResultLogger.logOperationStart логирует "operationName: count"
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление элементов в чеклисты: 1',
        expect.objectContaining({
          itemsCount: 1,
          fields: 2,
        })
      );
    });

    it('должен логировать успешное добавление', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklistItem },
      ];
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockResolvedValue(mockResult);

      await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
        fields: ['id', 'text', 'checked'],
      });

      // ResultLogger.logBatchResults логирует в debug
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Элементы добавлены в чеклисты'),
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
      vi.mocked(mockTrackerFacade.addChecklistItemMany).mockRejectedValue(error);

      const result = await tool.execute({
        items: [{ issueId: 'TEST-123', text: 'Test item' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении элементов в чеклисты');
    });
  });
});
