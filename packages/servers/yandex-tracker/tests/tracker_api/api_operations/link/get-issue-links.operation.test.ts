import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { LinkWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetIssueLinksOperation } from '@tracker_api/api_operations/link/get-issue-links.operation.js';
import {
  createLinkListFixture,
  createSubtaskLinkFixture,
  createRelatesLinkFixture,
  createDependsLinkFixture,
} from '../../../helpers/link.fixture.js';

describe('GetIssueLinksOperation', () => {
  let operation: GetIssueLinksOperation;
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

    operation = new GetIssueLinksOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockLinks: LinkWithUnknownFields[] = createLinkListFixture(3);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      const result = await operation.execute('TEST-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TEST-123/links');
      expect(result).toEqual(mockLinks);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no links exist', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue([]);

      const result = await operation.execute('TEST-456');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return links with different types', async () => {
      const mockLinks: LinkWithUnknownFields[] = [
        createSubtaskLinkFixture({ id: 'link1' }),
        createRelatesLinkFixture({ id: 'link2' }),
        createDependsLinkFixture({ id: 'link3' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      const result = await operation.execute('TEST-789');

      expect(result).toHaveLength(3);
      expect(result[0]!.type.id).toBe('subtask');
      expect(result[1]!.type.id).toBe('relates');
      expect(result[2]!.type.id).toBe('depends');
    });

    it('should return links with inward and outward directions', async () => {
      const mockLinks: LinkWithUnknownFields[] = [
        createSubtaskLinkFixture({ id: 'link1', direction: 'outward' }),
        createDependsLinkFixture({ id: 'link2', direction: 'inward' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      const result = await operation.execute('TEST-100');

      expect(result).toHaveLength(2);
      expect(result[0]!.direction).toBe('outward');
      expect(result[1]!.direction).toBe('inward');
    });

    // NOTE: Кеширование тестируется на уровне BaseOperation,
    // здесь не тестируем повторно для упрощения

    it('should log info and debug messages', async () => {
      const mockLinks: LinkWithUnknownFields[] = createLinkListFixture(5);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      await operation.execute('TEST-999');

      expect(mockLogger.info).toHaveBeenCalledWith('Получение связей для задачи: TEST-999');
      expect(mockLogger.debug).toHaveBeenCalledWith('Получено 5 связей для задачи TEST-999');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error: Issue not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute('INVALID-KEY')).rejects.toThrow('API Error: Issue not found');
    });

    it('should work with issue ID instead of key', async () => {
      const mockLinks: LinkWithUnknownFields[] = createLinkListFixture(1);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      const result = await operation.execute('abc123def456');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/abc123def456/links');
      expect(result).toHaveLength(1);
    });

    it('should handle large number of links', async () => {
      const mockLinks: LinkWithUnknownFields[] = createLinkListFixture(50);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockLinks);

      const result = await operation.execute('TEST-EPIC');

      expect(result).toHaveLength(50);
      expect(mockLogger.debug).toHaveBeenCalledWith('Получено 50 связей для задачи TEST-EPIC');
    });
  });
});
