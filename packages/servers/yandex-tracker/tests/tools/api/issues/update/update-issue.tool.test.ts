/**
 * Unit тесты для UpdateIssueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateIssueTool } from '@tools/api/issues/update/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { STANDARD_ISSUE_FIELDS } from '../../../../helpers/test-fields.js';

describe('UpdateIssueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateIssueTool;

  const mockUpdatedIssue: IssueWithUnknownFields = {
    id: '1',
    key: 'QUEUE-123',
    summary: 'Updated Summary',
    description: 'Updated Description',
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
      updateIssue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateIssueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('update_issue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Обнов');
      expect(definition.description).toContain('задач');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKey']);
      expect(definition.inputSchema.properties?.['issueKey']).toBeDefined();
      expect(definition.inputSchema.properties?.['summary']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueKey', async () => {
      const result = await tool.execute({ summary: 'Test' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен принимать частичные обновления', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.updateIssue).toHaveBeenCalledWith('QUEUE-123', {
        summary: 'New Summary',
      });
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать updateIssue с одним полем', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.updateIssue).toHaveBeenCalledWith('QUEUE-123', {
        summary: 'New Summary',
      });
    });

    it('должен вызвать updateIssue с несколькими полями', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        description: 'New Description',
        assignee: 'user1',
        priority: 'high',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.updateIssue).toHaveBeenCalledWith('QUEUE-123', {
        summary: 'New Summary',
        description: 'New Description',
        assignee: 'user1',
        priority: 'high',
      });
    });

    it('должен передать customFields в operation', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        customFields: {
          customField1: 'value1',
        },
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.updateIssue).toHaveBeenCalledWith('QUEUE-123', {
        customField1: 'value1',
      });
    });

    it('должен вернуть обновленную задачу', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueKey: string;
          updatedFields: string[];
          issue: IssueWithUnknownFields;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueKey).toBe('QUEUE-123');
      expect(parsed.data.updatedFields).toContain('summary');
      expect(parsed.data.issue.summary).toBe('Updated Summary');
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля когда указан fields параметр', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: ['id', 'key', 'summary'],
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
      expect(parsed.data.issue).toHaveProperty('summary');
      expect(parsed.data.issue).not.toHaveProperty('description');
      expect(parsed.data.issue).not.toHaveProperty('queue');
    });

    it('должен вернуть поля с фильтрацией', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
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
      expect(parsed.data.issue).toHaveProperty('summary');
      expect(parsed.data.issue).toHaveProperty('queue');
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });
  });

  describe('Logging', () => {
    it('должен логировать обновление задачи', async () => {
      vi.mocked(mockTrackerFacade.updateIssue).mockResolvedValue(mockUpdatedIssue);

      await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Обновление задачи'),
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('обновлена'),
        expect.objectContaining({
          updatedFields: ['summary'],
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.updateIssue).mockRejectedValue(error);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении задачи');
      expect(result.content[0]?.text).toContain('QUEUE-123');
    });

    it('должен обработать not found ошибки (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.updateIssue).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueKey: 'NOTFOUND-999',
        summary: 'New Summary',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при обновлении задачи');
    });
  });
});
