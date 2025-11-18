/**
 * Unit тесты для GetIssuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssuesTool } from '@tools/api/issues/get/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('GetIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssuesTool;

  const mockIssue1: IssueWithUnknownFields = {
    id: '1',
    key: 'QUEUE-123',
    summary: 'Test Issue 1',
    description: 'Test Description 1',
    queue: {
      id: '1',
      key: 'QUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '1',
      key: 'open',
      display: 'Open',
    },
    assignee: {
      uid: 'uid-user1',
      display: 'User One',
      login: 'user1',
      email: 'user1@example.com',
      isActive: true,
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

  const mockIssue2: IssueWithUnknownFields = {
    id: '2',
    key: 'QUEUE-456',
    summary: 'Test Issue 2',
    description: 'Test Description 2',
    queue: {
      id: '1',
      key: 'QUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '2',
      key: 'closed',
      display: 'Closed',
    },
    createdBy: {
      uid: 'uid-creator2',
      display: 'Creator 2',
      login: 'creator2',
      isActive: true,
    },
    createdAt: '2025-01-03T10:00:00Z',
    updatedAt: '2025-01-04T12:00:00Z',
  };

  beforeEach(() => {
    mockTrackerFacade = {
      getIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issues', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Получить задачи по ключам');
      expect(definition.description).toContain('Batch-режим');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKeys']);
      expect(definition.inputSchema.properties?.['issueKeys']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если issueKeys не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если issueKeys пустой массив', async () => {
        const result = await tool.execute({ issueKeys: [] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного формата ключа', async () => {
        const result = await tool.execute({ issueKeys: ['QUEUE-123', 'invalid-key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });
    });

    describe('получение задач', () => {
      it('должен получить одну задачу без фильтрации полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
        ]);

        const result = await tool.execute({ issueKeys: ['QUEUE-123'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith(['QUEUE-123']);
        expect(mockLogger.info).toHaveBeenCalled();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            total: number;
            successful: number;
            failed: number;
            issues: Array<{ issueKey: string; issue: IssueWithUnknownFields }>;
            errors: Array<{ issueKey: string; error: string }>;
            fieldsReturned: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(1);
        expect(parsed.data.successful).toBe(1);
        expect(parsed.data.failed).toBe(0);
        expect(parsed.data.issues).toHaveLength(1);
        expect(parsed.data.issues[0]?.issueKey).toBe('QUEUE-123');
        expect(parsed.data.issues[0]?.issue).toEqual(mockIssue1);
        expect(parsed.data.fieldsReturned).toBe('all');
      });

      it('должен получить несколько задач без фильтрации полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
          { status: 'fulfilled', value: mockIssue2, key: 'QUEUE-456', index: 1 },
        ]);

        const result = await tool.execute({ issueKeys: ['QUEUE-123', 'QUEUE-456'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith(['QUEUE-123', 'QUEUE-456']);

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            total: number;
            successful: number;
            failed: number;
            issues: Array<{ issueKey: string; issue: IssueWithUnknownFields }>;
            errors: Array<{ issueKey: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(2);
        expect(parsed.data.successful).toBe(2);
        expect(parsed.data.failed).toBe(0);
        expect(parsed.data.issues).toHaveLength(2);
        expect(parsed.data.issues[0]?.issueKey).toBe('QUEUE-123');
        expect(parsed.data.issues[1]?.issueKey).toBe('QUEUE-456');
      });

      it('должен получить задачи с фильтрацией полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['key', 'summary'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            issues: Array<{ issueKey: string; issue: Partial<IssueWithUnknownFields> }>;
            fieldsReturned: string[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.issues[0]?.issue).toEqual({
          key: 'QUEUE-123',
          summary: 'Test Issue 1',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать частичные ошибки', async () => {
        const apiError = new Error('API Error: Issue not found');
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
          { status: 'rejected', reason: apiError, key: 'QUEUE-999', index: 1 },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123', 'QUEUE-999'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            successful: number;
            failed: number;
            errors: Array<{ key: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.successful).toBe(1);
        expect(parsed.data.failed).toBe(1);
        expect(parsed.data.errors[0]?.key).toBe('QUEUE-999');
      });

      it('должен обработать критическую ошибку facade', async () => {
        const criticalError = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getIssues).mockRejectedValue(criticalError);

        const result = await tool.execute({ issueKeys: ['QUEUE-123'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении задач');
        expect(parsed.error).toBe('Network timeout');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });
});
