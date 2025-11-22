import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UpdateIssueDto } from '#tracker_api/dto/index.js';
import { UpdateIssueOperation } from '#tracker_api/api_operations/issue/update/update-issue.operation.js';
import {
  EntityCacheKey,
  EntityType,
} from '@mcp-framework/infrastructure/cache/entity-cache-key.js';

describe('UpdateIssueOperation', () => {
  let operation: UpdateIssueOperation;
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

    operation = new UpdateIssueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct URL and data', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = {
        summary: 'Updated Summary',
        description: 'Updated Description',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Updated Summary',
        description: 'Updated Description',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, updateData);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/issues/TEST-123', updateData);
      expect(result).toEqual(mockUpdatedIssue);
    });

    it('should return updated issue', async () => {
      const issueKey = 'PROJ-456';
      const updateData: UpdateIssueDto = {
        summary: 'New Summary',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '2',
        key: 'PROJ-456',
        summary: 'New Summary',
        queue: { id: '2', key: 'PROJ', name: 'Project' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user2', display: 'User 2', login: 'user2', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, updateData);

      expect(result.summary).toBe('New Summary');
    });

    it('should invalidate cache after update', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = {
        summary: 'Updated Summary',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Updated Summary',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, updateData);

      const expectedCacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
      expect(mockCacheManager.delete).toHaveBeenCalledWith(expectedCacheKey);
    });

    it('should handle validation errors (400)', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = {
        summary: '',
      };

      const mockError = new Error('HTTP 400: Validation failed');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, updateData)).rejects.toThrow(
        'HTTP 400: Validation failed'
      );
    });

    it('should handle not found errors (404)', async () => {
      const issueKey = 'NOTFOUND-999';
      const updateData: UpdateIssueDto = {
        summary: 'Updated Summary',
      };

      const mockError = new Error('HTTP 404: Issue not found');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, updateData)).rejects.toThrow(
        'HTTP 404: Issue not found'
      );
    });

    it('should log update success', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = {
        summary: 'Updated Summary',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Updated Summary',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, updateData);

      expect(mockLogger.info).toHaveBeenCalledWith(`Обновление задачи ${issueKey}`, {
        fields: ['summary'],
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`Задача ${issueKey} успешно обновлена`);
    });
  });
});
