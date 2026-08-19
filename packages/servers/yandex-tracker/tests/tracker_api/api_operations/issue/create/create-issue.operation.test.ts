import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueRef } from '#helpers/common-fixtures.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { CreateIssueDto } from '#tracker_api/dto/index.js';
import { CreateIssueOperation } from '#tracker_api/api_operations/issue/create/create-issue.operation.js';
import {
  EntityCacheKey,
  EntityType,
} from '@fractalizer/mcp-infrastructure/cache/entity-cache-key.js';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure/http/error/api-error.class.js';

describe('CreateIssueOperation', () => {
  let operation: CreateIssueOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      postWithResponse: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

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

    operation = new CreateIssueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct URL, data and config', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
        description: 'Test description',
      };

      const mockCreatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        description: 'Test description',
        queue: createQueueRef({ id: '1', key: 'TEST', display: 'Test Queue' }),
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/user1',
          id: 'user1',
          display: 'User 1',
        },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      const result = await operation.execute(issueData);

      // Пакет 1.1.C: payload дополняется ключом идемпотентности `unique`,
      // а POST объявляется идемпотентным для транспортного retry (3-й аргумент).
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/issues',
        { ...issueData, unique: expect.any(String) },
        true
      );
      expect(result).toEqual(mockCreatedIssue);
    });

    it('should return created issue', async () => {
      const issueData: CreateIssueDto = {
        queue: 'PROJ',
        summary: 'New Feature',
      };

      const mockCreatedIssue: IssueWithUnknownFields = {
        id: '2',
        key: 'PROJ-456',
        summary: 'New Feature',
        queue: createQueueRef({ id: '2', key: 'PROJ', display: 'Project' }),
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/user2',
          id: 'user2',
          display: 'User 2',
        },
        createdAt: '2024-01-02T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      const result = await operation.execute(issueData);

      expect(result.key).toBe('PROJ-456');
      expect(result.summary).toBe('New Feature');
    });

    it('should cache created issue', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
      };

      const mockCreatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: createQueueRef({ id: '1', key: 'TEST', display: 'Test Queue' }),
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/user1',
          id: 'user1',
          display: 'User 1',
        },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      await operation.execute(issueData);

      const expectedCacheKey = EntityCacheKey.createKey(EntityType.ISSUE, 'TEST-123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(expectedCacheKey, mockCreatedIssue);
    });

    it('should handle validation errors (400)', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: '',
      };

      const mockError = new Error('HTTP 400: Validation failed - summary is required');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(issueData)).rejects.toThrow(
        'HTTP 400: Validation failed - summary is required'
      );
    });

    it('should log creation success', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
      };

      const mockCreatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: createQueueRef({ id: '1', key: 'TEST', display: 'Test Queue' }),
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/user1',
          id: 'user1',
          display: 'User 1',
        },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      await operation.execute(issueData);

      expect(mockLogger.info).toHaveBeenCalledWith('Создание задачи в очереди TEST: "Test Issue"');
      expect(mockLogger.info).toHaveBeenCalledWith('Задача успешно создана: TEST-123');
    });
  });

  describe('идемпотентность создания (пакет 1.1.C)', () => {
    const mockCreatedIssue: IssueWithUnknownFields = {
      id: '1',
      key: 'TEST-123',
      summary: 'Test Issue',
      queue: createQueueRef({ id: '1', key: 'TEST', display: 'Test Queue' }),
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: {
        self: 'https://api.tracker.yandex.net/v3/users/user1',
        id: 'user1',
        display: 'User 1',
      },
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    };

    it('DoD: отправляет unique, сгенерированный автоматически, если не передан', async () => {
      const issueData: CreateIssueDto = { queue: 'TEST', summary: 'Test Issue' };
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      await operation.execute(issueData);

      const [, sentPayload] = vi.mocked(mockHttpClient.post).mock.calls[0] as [
        string,
        CreateIssueDto,
        boolean,
      ];
      expect(typeof sentPayload.unique).toBe('string');
      expect(sentPayload.unique).not.toHaveLength(0);
    });

    it('DoD: использует unique, явно переданный вызывающим (не перегенерирует)', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
        unique: 'caller-provided-unique-key',
      };
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      await operation.execute(issueData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/issues',
        expect.objectContaining({ unique: 'caller-provided-unique-key' }),
        true
      );
    });

    it('DoD: повтор с тем же unique (409 Conflict) не создаёт вторую задачу — возвращает существующую', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
        unique: 'retry-unique-key',
      };

      // Первая (эмулируемая транспортом) попытка "потерялась" на стороне
      // клиента, но фактически создала задачу — повторный POST с тем же
      // unique получает от API конфликт.
      vi.mocked(mockHttpClient.post).mockRejectedValue(
        new ApiErrorClass(409, 'Issue with this unique already exists')
      );
      // POST /v3/issues/_findByUnique находит уже созданную задачу.
      vi.mocked(mockHttpClient.postWithResponse).mockResolvedValue({
        data: mockCreatedIssue,
        headers: {},
      });

      const result = await operation.execute(issueData);

      expect(result).toEqual(mockCreatedIssue);
      expect(mockHttpClient.postWithResponse).toHaveBeenCalledWith(
        '/v3/issues/_findByUnique',
        undefined,
        { unique: 'retry-unique-key' }
      );
      // Только ОДИН вызов post (создание) — второй задачи не создано.
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('пробрасывает исходный 409, если задача по unique не находится (findByUnique провалился)', async () => {
      const issueData: CreateIssueDto = {
        queue: 'TEST',
        summary: 'Test Issue',
        unique: 'unmatched-unique-key',
      };
      const conflictError = new ApiErrorClass(409, 'Conflict');

      vi.mocked(mockHttpClient.post).mockRejectedValue(conflictError);
      vi.mocked(mockHttpClient.postWithResponse).mockRejectedValue(
        new ApiErrorClass(404, 'Not found by unique')
      );

      await expect(operation.execute(issueData)).rejects.toBe(conflictError);
    });

    it('не обращается к _findByUnique для ошибок, отличных от 409', async () => {
      const issueData: CreateIssueDto = { queue: 'TEST', summary: 'Test Issue' };
      vi.mocked(mockHttpClient.post).mockRejectedValue(new ApiErrorClass(400, 'Bad Request'));

      await expect(operation.execute(issueData)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockHttpClient.postWithResponse).not.toHaveBeenCalled();
    });
  });
});
