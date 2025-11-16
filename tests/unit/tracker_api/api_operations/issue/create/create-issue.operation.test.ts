import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import type { CreateIssueDto } from '@tracker_api/dto/index.js';
import { CreateIssueOperation } from '@tracker_api/api_operations/issue/create/create-issue.operation.js';
import { EntityCacheKey, EntityType } from '@infrastructure/cache/entity-cache-key.js';

describe('CreateIssueOperation', () => {
  let operation: CreateIssueOperation;
  let mockHttpClient: HttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
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
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      const result = await operation.execute(issueData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues', issueData);
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
        queue: { id: '2', key: 'PROJ', name: 'Project' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user2', display: 'User 2', login: 'user2', isActive: true },
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
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
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
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockCreatedIssue);

      await operation.execute(issueData);

      expect(mockLogger.info).toHaveBeenCalledWith('Создание задачи в очереди TEST: "Test Issue"');
      expect(mockLogger.info).toHaveBeenCalledWith('Задача успешно создана: TEST-123');
    });
  });
});
