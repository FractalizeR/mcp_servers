/**
 * Unit тесты для UpdateChecklistItemTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateChecklistItemTool } from '#tools/api/checklists/update/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
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
      updateChecklistItem: vi.fn(),
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

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Обновляет элемент чеклиста');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'checklistItemId', 'fields']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['checklistItemId']).toBeDefined();
      expect(definition.inputSchema.properties?.['text']).toBeDefined();
      expect(definition.inputSchema.properties?.['checked']).toBeDefined();
      expect(definition.inputSchema.properties?.['assignee']).toBeDefined();
      expect(definition.inputSchema.properties?.['deadline']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ checklistItemId: 'item-123', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр checklistItemId', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр fields', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', checklistItemId: 'item-123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({
        issueId: '',
        checklistItemId: 'item-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой checklistItemId', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: '',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать updateChecklistItem с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: undefined,
        checked: undefined,
        assignee: undefined,
        deadline: undefined,
      });
    });

    it('должен вызвать updateChecklistItem с text', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        text: 'Updated text',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: 'Updated text',
        checked: undefined,
        assignee: undefined,
        deadline: undefined,
      });
    });

    it('должен вызвать updateChecklistItem с checked', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        checked: true,
        fields: ['id', 'text', 'checked'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: undefined,
        checked: true,
        assignee: undefined,
        deadline: undefined,
      });
    });

    it('должен вызвать updateChecklistItem с assignee', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        assignee: 'user123',
        fields: ['id', 'text', 'assignee'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: undefined,
        checked: undefined,
        assignee: 'user123',
        deadline: undefined,
      });
    });

    it('должен вызвать updateChecklistItem с deadline', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        deadline: '2025-12-31T23:59:59.000Z',
        fields: ['id', 'text', 'deadline'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: undefined,
        checked: undefined,
        assignee: undefined,
        deadline: '2025-12-31T23:59:59.000Z',
      });
    });

    it('должен вызвать updateChecklistItem со всеми параметрами', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        text: 'Updated text',
        checked: true,
        assignee: 'user123',
        deadline: '2025-12-31T23:59:59.000Z',
        fields: ['id', 'text', 'checked', 'assignee', 'deadline'],
      });

      expect(mockTrackerFacade.updateChecklistItem).toHaveBeenCalledWith('TEST-123', 'item-123', {
        text: 'Updated text',
        checked: true,
        assignee: 'user123',
        deadline: '2025-12-31T23:59:59.000Z',
      });
    });

    it('должен вернуть обновлённый элемент', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        checked: true,
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          itemId: string;
          item: ChecklistItemWithUnknownFields;
          issueId: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.itemId).toBe('item-12345');
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.item).toMatchObject({
        id: 'item-12345',
        text: 'Updated item',
        checked: true,
      });
    });
  });

  describe('Logging', () => {
    it('должен логировать начало обновления элемента', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        checked: true,
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента чеклиста задачи',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemId: 'item-123',
          hasText: false,
          hasChecked: true,
          hasAssignee: false,
          hasDeadline: false,
          fieldsCount: 2,
        })
      );
    });

    it('должен логировать наличие text', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        text: 'Updated text',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента чеклиста задачи',
        expect.objectContaining({
          hasText: true,
        })
      );
    });

    it('должен логировать наличие assignee', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        assignee: 'user123',
        fields: ['id', 'text', 'assignee'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента чеклиста задачи',
        expect.objectContaining({
          hasAssignee: true,
        })
      );
    });

    it('должен логировать наличие deadline', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        deadline: '2025-12-31T23:59:59.000Z',
        fields: ['id', 'text', 'deadline'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента чеклиста задачи',
        expect.objectContaining({
          hasDeadline: true,
        })
      );
    });

    it('должен логировать успешное обновление', async () => {
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        checked: true,
        fields: ['id', 'text', 'checked'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент чеклиста успешно обновлён',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemId: 'item-12345',
          checked: true,
          fieldsReturned: 3,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'item-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении элемента');
      expect(result.content[0]?.text).toContain('item-123');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        checklistItemId: 'item-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении элемента');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку несуществующего элемента (404)', async () => {
      const notFoundError = new Error('Checklist item not found');
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'TEST-123',
        checklistItemId: 'nonexistent-item',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении элемента');
      expect(result.content[0]?.text).toContain('nonexistent-item');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.updateChecklistItem).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        checklistItemId: 'item-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении элемента');
    });
  });
});
