/**
 * Unit тесты для GetIssueTransitionsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueTransitionsTool } from '@tools/api/issues/transitions/get/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { TransitionWithUnknownFields } from '@tracker_api/entities/index.js';

describe('GetIssueTransitionsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssueTransitionsTool;

  const mockTransition1: TransitionWithUnknownFields = {
    id: 'close',
    self: 'https://api.tracker.yandex.net/v3/issues/QUEUE-123/transitions/close',
    display: 'Close',
    to: {
      id: '3',
      key: 'closed',
      display: 'Closed',
    },
  };

  const mockTransition2: TransitionWithUnknownFields = {
    id: 'reopen',
    self: 'https://api.tracker.yandex.net/v3/issues/QUEUE-123/transitions/reopen',
    display: 'Reopen',
    to: {
      id: '1',
      key: 'open',
      display: 'Open',
    },
  };

  beforeEach(() => {
    mockTrackerFacade = {
      getIssueTransitions: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetIssueTransitionsTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('get_issue_transitions');
      expect(definition.description).toContain('переход');
      expect(definition.description).toContain('статус');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKey']);
      expect(definition.inputSchema.properties?.['issueKey']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueKey', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getIssueTransitions с issueKey', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([mockTransition1]);

      await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(mockTrackerFacade.getIssueTransitions).toHaveBeenCalledWith('QUEUE-123');
    });

    it('должен вернуть список доступных переходов', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([
        mockTransition1,
        mockTransition2,
      ]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueKey: string;
          transitionsCount: number;
          transitions: TransitionWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueKey).toBe('QUEUE-123');
      expect(parsed.data.transitionsCount).toBe(2);
      expect(parsed.data.transitions).toHaveLength(2);
      expect(parsed.data.transitions[0]?.id).toBe('close');
      expect(parsed.data.transitions[1]?.id).toBe('reopen');
    });

    it('должен вернуть пустой список если нет доступных переходов', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          transitionsCount: number;
          transitions: TransitionWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.transitionsCount).toBe(0);
      expect(parsed.data.transitions).toHaveLength(0);
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля когда указан fields параметр', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([mockTransition1]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        fields: ['id', 'display'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          transitions: TransitionWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.transitions[0]).toHaveProperty('id');
      expect(parsed.data.transitions[0]).toHaveProperty('display');
      expect(parsed.data.transitions[0]).not.toHaveProperty('to');
    });

    it('должен вернуть все поля когда fields не указан', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([mockTransition1]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          transitions: TransitionWithUnknownFields[];
          fieldsReturned: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.transitions[0]).toHaveProperty('id');
      expect(parsed.data.transitions[0]).toHaveProperty('display');
      expect(parsed.data.transitions[0]).toHaveProperty('to');
      expect(parsed.data.fieldsReturned).toBe('all');
    });
  });

  describe('Logging', () => {
    it('должен логировать получение transitions', async () => {
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockResolvedValue([mockTransition1]);

      await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Переходы получены'),
        expect.objectContaining({
          issueKey: 'QUEUE-123',
          transitionsCount: 1,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockRejectedValue(error);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении переходов');
      expect(result.content[0]?.text).toContain('QUEUE-123');
    });

    it('должен обработать not found ошибки (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.getIssueTransitions).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueKey: 'NOTFOUND-999',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении переходов');
    });
  });
});
