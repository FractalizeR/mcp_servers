import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';
import { TransitionIssueOperation } from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';
import {
  EntityCacheKey,
  EntityType,
} from '@mcp-framework/infrastructure/cache/entity-cache-key.js';

describe('TransitionIssueOperation', () => {
  let operation: TransitionIssueOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as HttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new TransitionIssueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct URL and transition data', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';
      const transitionData: ExecuteTransitionDto = {
        comment: 'Moving to In Progress',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId, transitionData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/issues/TEST-123/transitions/transition1/_execute',
        transitionData
      );
      expect(result).toEqual(mockUpdatedIssue);
    });

    it('should return updated issue after transition', async () => {
      const issueKey = 'PROJ-456';
      const transitionId = 'close';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '2',
        key: 'PROJ-456',
        summary: 'Completed Task',
        queue: { id: '2', key: 'PROJ', name: 'Project' },
        status: { id: '3', key: 'closed', display: 'Closed' },
        createdBy: { uid: 'user2', display: 'User 2', login: 'user2', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId);

      expect(result.status.key).toBe('closed');
    });

    it('should invalidate cache after transition', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, transitionId);

      const expectedCacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
      expect(mockCacheManager.delete).toHaveBeenCalledWith(expectedCacheKey);
    });

    it('should handle invalid transition errors (400)', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'invalid-transition';

      const mockError = new Error('HTTP 400: Invalid transition');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, transitionId)).rejects.toThrow(
        'HTTP 400: Invalid transition'
      );
    });

    it('should handle not found errors (404)', async () => {
      const issueKey = 'NOTFOUND-999';
      const transitionId = 'transition1';

      const mockError = new Error('HTTP 404: Issue not found');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, transitionId)).rejects.toThrow(
        'HTTP 404: Issue not found'
      );
    });

    it('should log transition success', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, transitionId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Выполнение перехода ${transitionId} для задачи ${issueKey}`,
        {
          hasData: false,
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Переход выполнен успешно: ${issueKey} →`)
      );
    });

    it('should handle response without status field gracefully', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      // Имитация некорректного ответа API без поля status
      const mockUpdatedIssue = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      } as IssueWithUnknownFields;

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId);

      // Не должно быть ошибки, даже если status отсутствует
      expect(result).toEqual(mockUpdatedIssue);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Переход выполнен успешно: ${issueKey} → unknown`
      );
    });

    it('should normalize array response by taking first element', async () => {
      const issueKey = 'TEST-456';
      const transitionId = 'start';

      // Имитация некорректного ответа API - массив вместо объекта
      const mockIssue: IssueWithUnknownFields = {
        id: '2',
        key: 'TEST-456',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      // API вернул массив (известная проблема API)
      vi.mocked(mockHttpClient.post).mockResolvedValue([
        mockIssue,
      ] as unknown as IssueWithUnknownFields);

      const result = await operation.execute(issueKey, transitionId);

      // Должен вернуть первый элемент массива
      expect(result).toEqual(mockIssue);
      expect(result.key).toBe('TEST-456');
      expect(result.status?.key).toBe('inProgress');

      // Должен залогировать предупреждение
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('API вернул массив вместо объекта'),
        expect.objectContaining({ arrayLength: 1 })
      );
    });

    it('should throw error if API returns empty array', async () => {
      const issueKey = 'TEST-789';
      const transitionId = 'close';

      // API вернул пустой массив
      vi.mocked(mockHttpClient.post).mockResolvedValue([] as unknown as IssueWithUnknownFields);

      await expect(operation.execute(issueKey, transitionId)).rejects.toThrow(
        'API вернул пустой массив при выполнении перехода close'
      );
    });

    it('should handle array with multiple elements by taking first one', async () => {
      const issueKey = 'TEST-999';
      const transitionId = 'resolve';

      const mockIssue1: IssueWithUnknownFields = {
        id: '3',
        key: 'TEST-999',
        summary: 'First Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '3', key: 'resolved', display: 'Resolved' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      const mockIssue2: IssueWithUnknownFields = {
        id: '4',
        key: 'TEST-1000',
        summary: 'Second Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '3', key: 'resolved', display: 'Resolved' },
        createdBy: { uid: 'user2', display: 'User 2', login: 'user2', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      // API вернул массив из нескольких элементов
      vi.mocked(mockHttpClient.post).mockResolvedValue([
        mockIssue1,
        mockIssue2,
      ] as unknown as IssueWithUnknownFields);

      const result = await operation.execute(issueKey, transitionId);

      // Должен вернуть ПЕРВЫЙ элемент массива
      expect(result).toEqual(mockIssue1);
      expect(result.key).toBe('TEST-999');

      // Должен залогировать предупреждение с правильной длиной массива
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('API вернул массив вместо объекта'),
        expect.objectContaining({ arrayLength: 2 })
      );
    });
  });
});
