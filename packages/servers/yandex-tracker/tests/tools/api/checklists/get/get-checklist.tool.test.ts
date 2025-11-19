/**
 * Unit тесты для GetChecklistTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetChecklistTool } from '@tools/api/checklists/get/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createChecklistOutputFixture } from '../../../../helpers/checklist-dto.fixture.js';

describe('GetChecklistTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetChecklistTool;

  const mockChecklist: ChecklistItemWithUnknownFields[] = createChecklistOutputFixture(3);

  beforeEach(() => {
    mockTrackerFacade = {
      getChecklist: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetChecklistTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_get_checklist', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_checklist', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(GetChecklistTool.METADATA.category).toBe('checklists');
      expect(GetChecklistTool.METADATA.subcategory).toBe('read');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('чеклист');
      expect(definition.description).toContain('задачи');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'fields']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
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
      const result = await tool.execute({ issueId: '', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue(mockChecklist);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getChecklist с issueId', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue(mockChecklist);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getChecklist).toHaveBeenCalledWith('TEST-123');
    });

    it('должен вернуть чеклист', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue(mockChecklist);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          checklist: ChecklistItemWithUnknownFields[];
          issueId: string;
          itemsCount: number;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.itemsCount).toBe(3);
      expect(parsed.data.checklist).toHaveLength(3);
    });

    it('должен вернуть пустой чеклист', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue([]);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          checklist: ChecklistItemWithUnknownFields[];
          issueId: string;
          itemsCount: number;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.itemsCount).toBe(0);
      expect(parsed.data.checklist).toHaveLength(0);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало получения чеклиста', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue(mockChecklist);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение чеклиста задачи',
        expect.objectContaining({
          issueId: 'TEST-123',
          fieldsCount: 2,
        })
      );
    });

    it('должен логировать успешное получение', async () => {
      vi.mocked(mockTrackerFacade.getChecklist).mockResolvedValue(mockChecklist);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text', 'checked'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Чеклист успешно получен',
        expect.objectContaining({
          issueId: 'TEST-123',
          itemsCount: 3,
          fieldsReturned: 3,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getChecklist).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении чеклиста задачи');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.getChecklist).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении чеклиста задачи');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.getChecklist).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении чеклиста задачи');
    });
  });
});
