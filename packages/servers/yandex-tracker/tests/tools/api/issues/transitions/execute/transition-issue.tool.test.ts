/**
 * Unit тесты для TransitionIssueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransitionIssueTool } from '#tools/api/issues/transitions/execute/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';

describe('TransitionIssueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: TransitionIssueTool;

  const mockTransitionedIssue: IssueWithUnknownFields = {
    id: '1',
    key: 'QUEUE-123',
    summary: 'Test Issue',
    queue: {
      id: '1',
      key: 'QUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '2',
      key: 'in-progress',
      display: 'In Progress',
    },
    createdBy: {
      uid: 'uid-creator',
      display: 'Creator',
      login: 'creator',
      isActive: true,
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-02T12:00:00Z',
  };

  beforeEach(() => {
    mockTrackerFacade = {
      transitionIssue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new TransitionIssueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('transition_issue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Выполняет workflow-переход');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKey', 'transitionId']);
      expect(definition.inputSchema.properties?.['issueKey']).toBeDefined();
      expect(definition.inputSchema.properties?.['transitionId']).toBeDefined();
      expect(definition.inputSchema.properties?.['comment']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueKey', async () => {
      const result = await tool.execute({ transitionId: 'close', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр transitionId', async () => {
      const result = await tool.execute({ issueKey: 'QUEUE-123', fields: STANDARD_ISSUE_FIELDS });

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
    it('должен вызвать transitionIssue с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.transitionIssue).toHaveBeenCalledWith(
        'QUEUE-123',
        'close',
        undefined
      );
    });

    it('должен вызвать transitionIssue с комментарием', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        comment: 'Closing the issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.transitionIssue).toHaveBeenCalledWith('QUEUE-123', 'close', {
        comment: 'Closing the issue',
      });
    });

    it('должен вызвать transitionIssue с customFields', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
        customFields: {
          resolution: 'fixed',
        },
      });

      expect(mockTrackerFacade.transitionIssue).toHaveBeenCalledWith('QUEUE-123', 'close', {
        resolution: 'fixed',
      });
    });

    it('должен вызвать transitionIssue с комментарием и customFields', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
        comment: 'Closing',
        customFields: {
          resolution: 'fixed',
        },
      });

      expect(mockTrackerFacade.transitionIssue).toHaveBeenCalledWith('QUEUE-123', 'close', {
        comment: 'Closing',
        resolution: 'fixed',
      });
    });

    it('должен вернуть обновленную задачу после перехода', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'start-progress',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueKey: string;
          transitionId: string;
          issue: IssueWithUnknownFields;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueKey).toBe('QUEUE-123');
      expect(parsed.data.transitionId).toBe('start-progress');
      expect(parsed.data.issue.status.key).toBe('in-progress');
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля когда указан fields параметр', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: ['id', 'key', 'status'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issue: IssueWithUnknownFields;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issue).toHaveProperty('id');
      expect(parsed.data.issue).toHaveProperty('key');
      expect(parsed.data.issue).toHaveProperty('status');
      expect(parsed.data.issue).not.toHaveProperty('summary');
      expect(parsed.data.issue).not.toHaveProperty('queue');
    });

    it('должен вернуть поля с фильтрацией', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issue: IssueWithUnknownFields;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issue).toHaveProperty('id');
      expect(parsed.data.issue).toHaveProperty('key');
      expect(parsed.data.issue).toHaveProperty('status');
      expect(parsed.data.issue).toHaveProperty('summary');
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });
  });

  describe('Logging', () => {
    it('должен логировать выполнение перехода', async () => {
      vi.mocked(mockTrackerFacade.transitionIssue).mockResolvedValue(mockTransitionedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Выполнение перехода'),
        expect.objectContaining({
          transitionId: 'close',
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Переход выполнен'),
        expect.objectContaining({
          transitionId: 'close',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.transitionIssue).mockRejectedValue(error);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'close',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при выполнении перехода');
      expect(result.content[0]?.text).toContain('QUEUE-123');
      expect(result.content[0]?.text).toContain('close');
    });

    it('должен обработать invalid transition ошибки (400)', async () => {
      const invalidError = new Error('Invalid transition');
      vi.mocked(mockTrackerFacade.transitionIssue).mockRejectedValue(invalidError);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        transitionId: 'invalid-transition',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при выполнении перехода');
    });
  });
});
