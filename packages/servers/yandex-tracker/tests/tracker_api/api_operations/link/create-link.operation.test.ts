import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import type { CreateLinkDto } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { CreateLinkOperation } from '#tracker_api/api_operations/link/create-link.operation.js';
import { createLinkFixture, createSubtaskLinkFixture } from '#helpers/link.fixture.js';

describe('CreateLinkOperation', () => {
  let operation: CreateLinkOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

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

    mockConfig = {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new CreateLinkOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data for subtask relationship', async () => {
      const input: CreateLinkDto = {
        relationship: 'has subtasks',
        issue: 'TEST-456',
      };

      const mockLink: LinkWithUnknownFields = createSubtaskLinkFixture();

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('TEST-123', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/TEST-123/links', input);
      expect(result).toEqual(mockLink);
    });

    it('should create link with "relates" relationship', async () => {
      const input: CreateLinkDto = {
        relationship: 'relates',
        issue: 'TEST-789',
      };

      const mockLink: LinkWithUnknownFields = createLinkFixture({
        type: {
          id: 'relates',
          inward: 'связана с',
          outward: 'связана с',
        },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('TEST-123', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/TEST-123/links', input);
      expect(result.type.id).toBe('relates');
    });

    it('should create link with "depends on" relationship', async () => {
      const input: CreateLinkDto = {
        relationship: 'depends on',
        issue: 'TEST-999',
      };

      const mockLink: LinkWithUnknownFields = createLinkFixture({
        type: {
          id: 'depends',
          inward: 'зависит от',
          outward: 'блокирует',
        },
        direction: 'inward',
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('TEST-123', input);

      expect(result.type.id).toBe('depends');
      expect(result.direction).toBe('inward');
    });

    it('should create link with "duplicates" relationship', async () => {
      const input: CreateLinkDto = {
        relationship: 'duplicates',
        issue: 'TEST-888',
      };

      const mockLink: LinkWithUnknownFields = createLinkFixture({
        type: {
          id: 'duplicate',
          inward: 'дублируется',
          outward: 'дублирует',
        },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('TEST-123', input);

      expect(result.type.id).toBe('duplicate');
    });

    it('should create link with "has epic" relationship', async () => {
      const input: CreateLinkDto = {
        relationship: 'has epic',
        issue: 'EPIC-1',
      };

      const mockLink: LinkWithUnknownFields = createLinkFixture({
        type: {
          id: 'epic',
          inward: 'входит в epic',
          outward: 'является epic для',
        },
        direction: 'inward',
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('TEST-123', input);

      expect(result.type.id).toBe('epic');
    });

    it('should invalidate cache for both issues after creating link', async () => {
      const input: CreateLinkDto = {
        relationship: 'has subtasks',
        issue: 'TEST-456',
      };

      const mockLink: LinkWithUnknownFields = createSubtaskLinkFixture();

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      await operation.execute('TEST-123', input);

      // Кеш должен быть инвалидирован для обеих задач
      expect(mockCacheManager.delete).toHaveBeenCalledTimes(2);
    });

    it('should log info messages', async () => {
      const input: CreateLinkDto = {
        relationship: 'relates',
        issue: 'TEST-789',
      };

      const mockLink: LinkWithUnknownFields = createLinkFixture();

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      await operation.execute('TEST-123', input);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Создание связи для задачи TEST-123: relates → TEST-789'
      );
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const input: CreateLinkDto = {
        relationship: 'relates',
        issue: 'TEST-456',
      };

      const error = new Error('API Error: Link already exists');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute('TEST-123', input)).rejects.toThrow(
        'API Error: Link already exists'
      );
    });

    it('should work with issue ID instead of key', async () => {
      const input: CreateLinkDto = {
        relationship: 'has subtasks',
        issue: 'abc123def456',
      };

      const mockLink: LinkWithUnknownFields = createSubtaskLinkFixture({
        object: {
          id: 'abc123def456',
          key: 'TEST-456',
          display: 'Test issue',
        },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLink);

      const result = await operation.execute('xyz789', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/issues/xyz789/links', input);
      expect(result.object.id).toBe('abc123def456');
    });
  });

  describe('executeMany', () => {
    it('should create multiple links with individual parameters', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'has subtasks', targetIssue: 'TEST-4' },
      ];

      const mockLink1 = createLinkFixture({
        id: 'link-1',
        type: { id: 'relates', inward: 'связана с', outward: 'связана с' },
      });
      const mockLink2 = createSubtaskLinkFixture({
        id: 'link-2',
      });

      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce(mockLink1)
        .mockResolvedValueOnce(mockLink2);

      const results = await operation.executeMany(links);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures when creating links', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'invalid', targetIssue: 'TEST-4' },
      ];

      const mockLink = createLinkFixture();
      const error = new Error('Invalid relationship');

      vi.mocked(mockHttpClient.post).mockResolvedValueOnce(mockLink).mockRejectedValueOnce(error);

      const results = await operation.executeMany(links);

      expect(results).toHaveLength(2);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('should use individual parameters for each link', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'depends on', targetIssue: 'TEST-4' },
      ];

      vi.mocked(mockHttpClient.post).mockResolvedValue(createLinkFixture());

      await operation.executeMany(links);

      expect(mockHttpClient.post).toHaveBeenNthCalledWith(1, '/v3/issues/TEST-1/links', {
        relationship: 'relates',
        issue: 'TEST-2',
      });
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(2, '/v3/issues/TEST-3/links', {
        relationship: 'depends on',
        issue: 'TEST-4',
      });
    });

    it('should return empty result for empty links array', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('CreateLinkOperation: пустой массив связей');
    });

    it('should log batch operation start', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'has subtasks', targetIssue: 'TEST-4' },
      ];

      vi.mocked(mockHttpClient.post).mockResolvedValue(createLinkFixture());

      await operation.executeMany(links);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Создание 2 связей параллельно')
      );
    });

    it('should handle all successful creations', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'relates', targetIssue: 'TEST-4' },
        { issueId: 'TEST-5', relationship: 'relates', targetIssue: 'TEST-6' },
      ];

      vi.mocked(mockHttpClient.post).mockResolvedValue(createLinkFixture());

      const results = await operation.executeMany(links);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    });

    it('should handle all failures', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'invalid', targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'invalid', targetIssue: 'TEST-4' },
      ];

      const error = new Error('Invalid relationship');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      const results = await operation.executeMany(links);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'rejected')).toBe(true);
    });
  });
});
