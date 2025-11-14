/**
 * Unit тесты для GetIssuesTool
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import { GetIssuesTool } from '@mcp/tools/get-issues.tool.js';
import type { YandexTrackerFacade } from '@domain/facade/yandex-tracker.facade.js';
import type { Logger } from '@infrastructure/logger.js';
import type { Issue } from '@domain/entities/issue.entity.js';

describe('GetIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssuesTool;

  const mockIssue1: Issue = {
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

  const mockIssue2: Issue = {
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

      expect(definition.name).toBe('yandex_tracker_get_issues');
      expect(definition.description).toContain('Получение информации о задачах');
      expect(definition.description).toContain('batch-режим');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKeys']);
      expect(definition.inputSchema.properties?.['issueKeys']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров', () => {
      it('должен вернуть ошибку если issueKeys не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('обязателен');
      });

      it('должен вернуть ошибку если issueKeys не массив', async () => {
        const result = await tool.execute({ issueKeys: 'QUEUE-123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('массивом');
      });

      it('должен вернуть ошибку если issueKeys пустой массив', async () => {
        const result = await tool.execute({ issueKeys: [] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('не может быть пустым');
      });

      it('должен вернуть ошибку для некорректного формата ключа', async () => {
        const result = await tool.execute({ issueKeys: ['QUEUE-123', 'invalid-key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('формат');
        expect(parsed.message).toContain('invalid-key');
      });

      it('должен вернуть ошибку если fields не массив', async () => {
        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: 'not-an-array',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('массивом');
      });

      it('должен вернуть ошибку для некорректного формата полей', async () => {
        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['valid-field', 'invalid-field!'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Недопустимый формат поля');
      });
    });

    describe('получение задач', () => {
      it('должен получить одну задачу без фильтрации полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
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
            issues: Array<{ issueKey: string; issue: Issue }>;
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
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
          { status: 'fulfilled', value: mockIssue2, issueKey: 'QUEUE-456' },
        ]);

        const result = await tool.execute({ issueKeys: ['QUEUE-123', 'QUEUE-456'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith([
          'QUEUE-123',
          'QUEUE-456',
        ]);

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            total: number;
            successful: number;
            failed: number;
            issues: Array<{ issueKey: string; issue: Issue }>;
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

      it('должен получить задачи с фильтрацией полей верхнего уровня', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
          { status: 'fulfilled', value: mockIssue2, issueKey: 'QUEUE-456' },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123', 'QUEUE-456'],
          fields: ['key', 'summary'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            issues: Array<{ issueKey: string; issue: Partial<Issue> }>;
            fieldsReturned: string[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.issues[0]?.issue).toEqual({
          key: 'QUEUE-123',
          summary: 'Test Issue 1',
        });
        expect(parsed.data.issues[1]?.issue).toEqual({
          key: 'QUEUE-456',
          summary: 'Test Issue 2',
        });
        expect(parsed.data.fieldsReturned).toEqual(['key', 'summary']);
      });

      it('должен получить задачи с фильтрацией вложенных полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['key', 'assignee.login', 'assignee.email'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            issues: Array<{ issueKey: string; issue: Partial<Issue> }>;
            fieldsReturned: string[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.issues[0]?.issue).toEqual({
          key: 'QUEUE-123',
          assignee: {
            login: 'user1',
            email: 'user1@example.com',
          },
        });
        expect(parsed.data.fieldsReturned).toEqual([
          'assignee.email',
          'assignee.login',
          'key',
        ]);
      });

      it('должен нормализовать дубликаты в списке полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['key', 'summary', 'key', 'summary'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fieldsReturned: string[];
          };
        };
        expect(parsed.data.fieldsReturned).toEqual(['key', 'summary']);
      });

      it('должен вернуть ошибку при пустом массиве полей', async () => {
        const result = await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: [],
        });

        expect(result.isError).toBe(true);

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Параметр fields обязателен');
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать частичные ошибки (часть задач успешно получена)', async () => {
        const apiError = new Error('API Error: Issue not found');
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
          { status: 'rejected', reason: apiError, issueKey: 'QUEUE-999' },
          { status: 'fulfilled', value: mockIssue2, issueKey: 'QUEUE-456' },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-123', 'QUEUE-999', 'QUEUE-456'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            total: number;
            successful: number;
            failed: number;
            issues: Array<{ issueKey: string; issue: Issue }>;
            errors: Array<{ issueKey: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(3);
        expect(parsed.data.successful).toBe(2);
        expect(parsed.data.failed).toBe(1);
        expect(parsed.data.issues).toHaveLength(2);
        expect(parsed.data.errors).toHaveLength(1);
        expect(parsed.data.errors[0]?.issueKey).toBe('QUEUE-999');
        expect(parsed.data.errors[0]?.error).toBe('API Error: Issue not found');
      });

      it('должен обработать все ошибки (ни одна задача не получена)', async () => {
        const apiError1 = new Error('Not found');
        const apiError2 = new Error('Access denied');
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'rejected', reason: apiError1, issueKey: 'QUEUE-999' },
          { status: 'rejected', reason: apiError2, issueKey: 'QUEUE-888' },
        ]);

        const result = await tool.execute({
          issueKeys: ['QUEUE-999', 'QUEUE-888'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            total: number;
            successful: number;
            failed: number;
            errors: Array<{ issueKey: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(2);
        expect(parsed.data.successful).toBe(0);
        expect(parsed.data.failed).toBe(2);
        expect(parsed.data.errors).toHaveLength(2);
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

    describe('логирование', () => {
      it('должен логировать информацию о запросе одной задачи', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
        ]);

        await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['key', 'summary'],
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Получение задач: 1', {
          issueKeys: ['QUEUE-123'],
          fields: 2,
        });
      });

      it('должен логировать информацию о запросе нескольких задач', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
          { status: 'fulfilled', value: mockIssue2, issueKey: 'QUEUE-456' },
        ]);

        await tool.execute({
          issueKeys: ['QUEUE-123', 'QUEUE-456'],
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Получение задач: 2', {
          issueKeys: ['QUEUE-123', 'QUEUE-456'],
          fields: 'all',
        });
      });

      it('должен логировать информацию о результатах', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, issueKey: 'QUEUE-123' },
        ]);

        await tool.execute({
          issueKeys: ['QUEUE-123'],
          fields: ['key'],
        });

        expect(mockLogger.debug).toHaveBeenCalledWith('Задачи получены (1 шт.)', {
          successful: 1,
          failed: 0,
          fieldsCount: 1,
        });
      });
    });
  });
});
