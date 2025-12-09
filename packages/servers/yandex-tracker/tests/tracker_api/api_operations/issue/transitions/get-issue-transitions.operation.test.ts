import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { TransitionWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueTransitionsOperation } from '#tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.js';

describe('GetIssueTransitionsOperation', () => {
  let operation: GetIssueTransitionsOperation;
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

    operation = new GetIssueTransitionsOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct URL', async () => {
      const issueKey = 'TEST-123';
      const mockTransitions: TransitionWithUnknownFields[] = [
        {
          id: 'transition1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/transitions/transition1',
          display: 'Start Progress',
          to: { id: 'status2', key: 'inProgress', display: 'In Progress' },
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransitions);

      const result = await operation.execute(issueKey);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TEST-123/transitions');
      expect(result).toEqual(mockTransitions);
    });

    it('should return transitions array', async () => {
      const issueKey = 'PROJ-456';
      const mockTransitions: TransitionWithUnknownFields[] = [
        {
          id: 'transition1',
          self: 'https://api.tracker.yandex.net/v3/issues/PROJ-456/transitions/transition1',
          display: 'Start Progress',
          to: { id: 'status2', key: 'inProgress', display: 'In Progress' },
        },
        {
          id: 'transition2',
          self: 'https://api.tracker.yandex.net/v3/issues/PROJ-456/transitions/transition2',
          display: 'Close',
          to: { id: 'status3', key: 'closed', display: 'Closed' },
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransitions);

      const result = await operation.execute(issueKey);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockTransitions);
    });

    it('should handle not found errors (404)', async () => {
      const issueKey = 'NOTFOUND-999';
      const mockError = new Error('HTTP 404: Issue not found');

      vi.mocked(mockHttpClient.get).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey)).rejects.toThrow('HTTP 404: Issue not found');
    });

    it('should handle HTTP errors', async () => {
      const issueKey = 'TEST-789';
      const mockError = new Error('HTTP 500: Internal Server Error');

      vi.mocked(mockHttpClient.get).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey)).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });
});
