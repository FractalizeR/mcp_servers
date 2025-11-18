/**
 * Unit тесты для AddChecklistItemTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddChecklistItemTool } from '@tools/api/checklists/add/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createChecklistItemFixture } from '../../../../helpers/checklist-item.fixture.js';

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
      addChecklistItem: vi.fn(),
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

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('элемент');
      expect(definition.description).toContain('чеклист');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'text']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['text']).toBeDefined();
      expect(definition.inputSchema.properties?.['checked']).toBeDefined();
      expect(definition.inputSchema.properties?.['assignee']).toBeDefined();
      expect(definition.inputSchema.properties?.['deadline']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ text: 'Test item' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр text', async () => {
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
      const result = await tool.execute({ issueId: '', text: 'Test item' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой text', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', text: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать addChecklistItem с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
      });

      expect(mockTrackerFacade.addChecklistItem).toHaveBeenCalledWith('TEST-123', {
        text: 'Test item',
        checked: undefined,
        assignee: undefined,
        deadline: undefined,
      });
    });

    it('должен вызвать addChecklistItem с checked', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        checked: true,
      });

      expect(mockTrackerFacade.addChecklistItem).toHaveBeenCalledWith('TEST-123', {
        text: 'Test item',
        checked: true,
        assignee: undefined,
        deadline: undefined,
      });
    });

    it('должен вызвать addChecklistItem с assignee', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        assignee: 'user123',
      });

      expect(mockTrackerFacade.addChecklistItem).toHaveBeenCalledWith('TEST-123', {
        text: 'Test item',
        checked: undefined,
        assignee: 'user123',
        deadline: undefined,
      });
    });

    it('должен вызвать addChecklistItem с deadline', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        deadline: '2025-12-31T23:59:59.000Z',
      });

      expect(mockTrackerFacade.addChecklistItem).toHaveBeenCalledWith('TEST-123', {
        text: 'Test item',
        checked: undefined,
        assignee: undefined,
        deadline: '2025-12-31T23:59:59.000Z',
      });
    });

    it('должен вызвать addChecklistItem со всеми параметрами', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        checked: true,
        assignee: 'user123',
        deadline: '2025-12-31T23:59:59.000Z',
      });

      expect(mockTrackerFacade.addChecklistItem).toHaveBeenCalledWith('TEST-123', {
        text: 'Test item',
        checked: true,
        assignee: 'user123',
        deadline: '2025-12-31T23:59:59.000Z',
      });
    });

    it('должен вернуть добавленный элемент', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
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
        text: 'Test checklist item',
        checked: false,
      });
    });
  });

  describe('Logging', () => {
    it('должен логировать начало добавления элемента', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление элемента в чеклист задачи',
        expect.objectContaining({
          issueId: 'TEST-123',
          textLength: 9,
          hasAssignee: false,
          hasDeadline: false,
        })
      );
    });

    it('должен логировать наличие assignee', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        assignee: 'user123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление элемента в чеклист задачи',
        expect.objectContaining({
          hasAssignee: true,
        })
      );
    });

    it('должен логировать наличие deadline', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
        deadline: '2025-12-31T23:59:59.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление элемента в чеклист задачи',
        expect.objectContaining({
          hasDeadline: true,
        })
      );
    });

    it('должен логировать успешное добавление', async () => {
      vi.mocked(mockTrackerFacade.addChecklistItem).mockResolvedValue(mockChecklistItem);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент успешно добавлен в чеклист',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemId: 'item-12345',
          checked: false,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.addChecklistItem).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test item',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении элемента в чеклист задачи');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.addChecklistItem).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        text: 'Test item',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении элемента в чеклист задачи');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.addChecklistItem).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        text: 'Test item',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении элемента в чеклист задачи');
    });
  });
});
