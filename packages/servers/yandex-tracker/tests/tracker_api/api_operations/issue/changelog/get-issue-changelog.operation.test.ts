import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ChangelogEntryWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetIssueChangelogOperation } from '@tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';

describe('GetIssueChangelogOperation', () => {
  let operation: GetIssueChangelogOperation;
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

    operation = new GetIssueChangelogOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct URL and config', async () => {
      const issueKey = 'TEST-123';
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/changelog/1',
          issue: { id: '123', key: 'TEST-123', display: 'Test Issue' },
          updatedAt: '2024-01-01T10:00:00.000Z',
          updatedBy: {
            uid: 'user1',
            display: 'User 1',
            login: 'user1',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [
            {
              field: {
                id: 'status',
                display: 'Status',
              },
              from: { id: '1', key: 'open', display: 'Open' },
              to: { id: '2', key: 'inProgress', display: 'In Progress' },
            },
          ],
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChangelog);

      const result = await operation.execute(issueKey);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TEST-123/changelog');
      expect(result).toEqual(mockChangelog);
    });

    it('should return changelog array', async () => {
      const issueKey = 'PROJ-456';
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/PROJ-456/changelog/1',
          issue: { id: '456', key: 'PROJ-456', display: 'Test Issue' },
          updatedAt: '2024-01-01T10:00:00.000Z',
          updatedBy: {
            uid: 'user1',
            display: 'User 1',
            login: 'user1',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [],
        },
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v3/issues/PROJ-456/changelog/2',
          issue: { id: '456', key: 'PROJ-456', display: 'Test Issue' },
          updatedAt: '2024-01-02T10:00:00.000Z',
          updatedBy: {
            uid: 'user2',
            display: 'User 2',
            login: 'user2',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [],
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChangelog);

      const result = await operation.execute(issueKey);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockChangelog);
    });

    it('should handle HTTP errors', async () => {
      const issueKey = 'TEST-789';
      const mockError = new Error('HTTP 404: Issue not found');

      vi.mocked(mockHttpClient.get).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey)).rejects.toThrow('HTTP 404: Issue not found');
    });

    it('should pass logger to BaseOperation', () => {
      expect(mockLogger.info).toBeDefined();
    });

    it('should include requestId in logs', async () => {
      const issueKey = 'TEST-123';
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChangelog);

      await operation.execute(issueKey);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Получение истории изменений задачи: ${issueKey}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith('История изменений получена: 0 записей');
    });
  });
});
