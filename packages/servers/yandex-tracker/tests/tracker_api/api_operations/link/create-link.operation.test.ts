import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { LinkWithUnknownFields } from '@tracker_api/entities/index.js';
import type { CreateLinkDto } from '@tracker_api/dto/index.js';
import { CreateLinkOperation } from '@tracker_api/api_operations/link/create-link.operation.js';
import { createLinkFixture, createSubtaskLinkFixture } from '../../../helpers/link.fixture.js';

describe('CreateLinkOperation', () => {
  let operation: CreateLinkOperation;
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

    operation = new CreateLinkOperation(mockHttpClient, mockCacheManager, mockLogger);
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
});
