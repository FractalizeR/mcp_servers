import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import { createQueueFixture, createQueueListFixture } from '#helpers/queue.fixture.js';

describe('GetQueuesOperation', () => {
  let operation: GetQueuesOperation;
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

    operation = new GetQueuesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(3);

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      const result = await operation.execute();

      // По умолчанию perPage=50, page=1
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues?perPage=50&page=1');
      expect(result).toEqual(mockQueues);
    });

    it('should pass pagination parameters (perPage, page)', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(2);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      await operation.execute({ perPage: 100, page: 2 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues?perPage=100&page=2');
    });

    it('should pass expand parameter', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(1);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      await operation.execute({ expand: 'projects' });

      // perPage и page всегда добавляются (defaults 50, 1)
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/queues?perPage=50&page=1&expand=projects'
      );
    });

    it('should pass all parameters together', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(2);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      await operation.execute({ perPage: 50, page: 3, expand: 'projects,issueTypes' });

      // Запятая в expand кодируется как %2C
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v3/queues?perPage=50&page=3&expand=projects%2CissueTypes'
      );
    });

    it('should handle empty result', async () => {
      const emptyResult: QueueWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyResult);

      const result = await operation.execute();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should use default pagination values when not provided', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(3);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      await operation.execute({});

      // perPage=50, page=1 по умолчанию
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues?perPage=50&page=1');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute()).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(5);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueues);

      await operation.execute({ perPage: 50, page: 1 });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение списка очередей (page=1, perPage=50)'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 5 очередей');
    });

    it('should return queues with correct structure', async () => {
      const mockQueue = createQueueFixture({
        key: 'TEST',
        name: 'Test Queue',
        version: 1,
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue([mockQueue]);

      const result = await operation.execute();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        key: 'TEST',
        name: 'Test Queue',
        version: 1,
      });
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('self');
      expect(result[0]).toHaveProperty('lead');
      expect(result[0]).toHaveProperty('defaultType');
      expect(result[0]).toHaveProperty('defaultPriority');
    });
  });
});
