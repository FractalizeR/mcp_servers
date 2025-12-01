/**
 * Unit тесты для CreateIssueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateIssueTool } from '#tools/api/issues/create/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';

describe('CreateIssueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateIssueTool;

  const mockCreatedIssue: IssueWithUnknownFields = {
    id: '1',
    key: 'TESTQUEUE-1',
    summary: 'Test Issue',
    description: 'Test Description',
    queue: {
      id: '1',
      key: 'TESTQUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '1',
      key: 'open',
      display: 'Open',
    },
    createdBy: {
      uid: 'uid-creator',
      display: 'Creator',
      login: 'creator',
      isActive: true,
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z',
  };

  beforeEach(() => {
    mockTrackerFacade = {
      createIssue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new CreateIssueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('create_issue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Создать');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['queue', 'summary', 'fields']);
      expect(definition.inputSchema.properties?.['queue']).toBeDefined();
      expect(definition.inputSchema.properties?.['summary']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр queue', async () => {
      const result = await tool.execute({ summary: 'Test' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр summary', async () => {
      const result = await tool.execute({ queue: 'TESTQUEUE' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой queue', async () => {
      const result = await tool.execute({ queue: '', summary: 'Test' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('queue');
    });

    it('должен отклонить пустой summary', async () => {
      const result = await tool.execute({ queue: 'TESTQUEUE', summary: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('summary');
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать createIssue с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.createIssue).toHaveBeenCalledWith({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
      });
    });

    it('должен вызвать createIssue со всеми опциональными полями', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        description: 'Test Description',
        assignee: 'user1',
        priority: 'high',
        type: 'task',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.createIssue).toHaveBeenCalledWith({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        description: 'Test Description',
        assignee: 'user1',
        priority: 'high',
        type: 'task',
      });
    });

    it('должен передать customFields в operation', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        customFields: {
          customField1: 'value1',
          customField2: 123,
        },
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.createIssue).toHaveBeenCalledWith({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        customField1: 'value1',
        customField2: 123,
      });
    });

    it('должен вернуть созданную задачу', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      const result = await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueKey: string;
          issue: IssueWithUnknownFields;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueKey).toBe('TESTQUEUE-1');
      expect(parsed.data.issue).toMatchObject({
        id: '1',
        key: 'TESTQUEUE-1',
        summary: 'Test Issue',
      });
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля когда указан fields параметр', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      const result = await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: ['id', 'key', 'summary'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issue: IssueWithUnknownFields;
          fieldsReturned: string | string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issue).toHaveProperty('id');
      expect(parsed.data.issue).toHaveProperty('key');
      expect(parsed.data.issue).toHaveProperty('summary');
      expect(parsed.data.issue).not.toHaveProperty('description');
      expect(parsed.data.issue).not.toHaveProperty('queue');
      expect(parsed.data.issue).not.toHaveProperty('status');
    });

    it('должен вернуть поля с фильтрацией', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      const result = await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
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
      expect(parsed.data.issue).toHaveProperty('summary');
      expect(parsed.data.issue).toHaveProperty('description');
      expect(parsed.data.issue).toHaveProperty('queue');
      expect(parsed.data.issue).toHaveProperty('status');
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });

    it('должен фильтровать вложенные поля', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      const result = await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: ['id', 'key', 'queue.key'],
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
      expect(parsed.data.issue).toHaveProperty('queue');
      expect(parsed.data.issue.queue).toHaveProperty('key');
      expect(parsed.data.issue.queue).not.toHaveProperty('id');
      expect(parsed.data.issue.queue).not.toHaveProperty('name');
    });
  });

  describe('Logging', () => {
    it('должен логировать начало создания задачи', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        description: 'Test Description',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Создание новой задачи',
        expect.objectContaining({
          queue: 'TESTQUEUE',
          summary: 'Test Issue',
          hasDescription: true,
        })
      );
    });

    it('должен логировать успешное создание', async () => {
      vi.mocked(mockTrackerFacade.createIssue).mockResolvedValue(mockCreatedIssue);

      await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Задача успешно создана',
        expect.objectContaining({
          issueKey: 'TESTQUEUE-1',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.createIssue).mockRejectedValue(error);

      const result = await tool.execute({
        queue: 'TESTQUEUE',
        summary: 'Test Issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при создании задачи');
      expect(result.content[0]?.text).toContain('TESTQUEUE');
    });

    it('должен обработать ошибки валидации (400)', async () => {
      const validationError = new Error('Invalid queue');
      vi.mocked(mockTrackerFacade.createIssue).mockRejectedValue(validationError);

      const result = await tool.execute({
        queue: 'INVALID',
        summary: 'Test Issue',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при создании задачи');
    });
  });
});
