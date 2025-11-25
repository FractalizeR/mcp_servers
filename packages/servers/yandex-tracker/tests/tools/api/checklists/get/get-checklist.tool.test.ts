/**
 * Unit тесты для GetChecklistTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetChecklistTool } from '#tools/api/checklists/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createChecklistOutputFixture } from '#helpers/checklist-dto.fixture.js';

describe('GetChecklistTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetChecklistTool;

  const mockChecklist: ChecklistItemWithUnknownFields[] = createChecklistOutputFixture(3);

  beforeEach(() => {
    mockTrackerFacade = {
      getChecklistMany: vi.fn(),
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

      expect(definition.description).toContain('Получить чеклист');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueIds', 'fields']);
      expect(definition.inputSchema.properties?.['issueIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueIds', async () => {
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
      const result = await tool.execute({ issueIds: ['TEST-123'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив issueIds', async () => {
      const result = await tool.execute({ issueIds: [], fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой issueId в массиве', async () => {
      const result = await tool.execute({ issueIds: [''], fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getChecklistMany с issueIds', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getChecklistMany).toHaveBeenCalledWith(['TEST-123']);
    });

    it('должен вызвать getChecklistMany с несколькими issueIds', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
        { status: 'fulfilled', key: 'TEST-456', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getChecklistMany).toHaveBeenCalledWith(['TEST-123', 'TEST-456']);
    });

    it('должен вернуть чеклист одной задачи', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            itemsCount: number;
            checklist: ChecklistItemWithUnknownFields[];
          }>;
          failed: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.successful[0].issueId).toBe('TEST-123');
      expect(parsed.data.successful[0].itemsCount).toBe(3);
      expect(parsed.data.successful[0].checklist).toHaveLength(3);
    });

    it('должен вернуть чеклисты нескольких задач', async () => {
      const checklist1 = createChecklistOutputFixture(2);
      const checklist2 = createChecklistOutputFixture(4);
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: checklist1 },
        { status: 'fulfilled', key: 'TEST-456', value: checklist2 },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text', 'checked'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            itemsCount: number;
            checklist: ChecklistItemWithUnknownFields[];
          }>;
          failed: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(2);
      expect(parsed.data.successful[0].itemsCount).toBe(2);
      expect(parsed.data.successful[1].itemsCount).toBe(4);
    });

    it('должен вернуть пустой чеклист', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: [] },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            itemsCount: number;
            checklist: ChecklistItemWithUnknownFields[];
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.successful[0].itemsCount).toBe(0);
      expect(parsed.data.successful[0].checklist).toHaveLength(0);
    });
  });

  describe('Partial failures', () => {
    it('должен обработать частичные ошибки', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
        { status: 'rejected', key: 'TEST-456', reason: new Error('Issue not found') },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string }>;
          failed: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.successful[0].issueId).toBe('TEST-123');
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].issueId).toBe('TEST-456');
      expect(parsed.data.failed[0].error).toContain('Issue not found');
    });

    it('должен обработать полный провал batch операции', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'rejected', key: 'TEST-123', reason: new Error('API Error') },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string }>;
          failed: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toHaveLength(0);
      expect(parsed.data.failed).toHaveLength(1);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало получения чеклистов', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      // ResultLogger.logOperationStart логирует "operationName: count"
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение чеклистов задач: 1',
        expect.objectContaining({
          itemsCount: 1,
          fields: 2,
        })
      );
    });

    it('должен логировать успешное получение', async () => {
      const mockResult: BatchResult<string, ChecklistItemWithUnknownFields[]> = [
        { status: 'fulfilled', key: 'TEST-123', value: mockChecklist },
      ];
      vi.mocked(mockTrackerFacade.getChecklistMany).mockResolvedValue(mockResult);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text', 'checked'],
      });

      // ResultLogger.logBatchResults логирует в debug, не info
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Чеклисты задач получены'),
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
      vi.mocked(mockTrackerFacade.getChecklistMany).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении чеклистов');
    });
  });
});
