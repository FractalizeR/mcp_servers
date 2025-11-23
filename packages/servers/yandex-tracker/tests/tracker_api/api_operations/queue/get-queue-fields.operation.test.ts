import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueueFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetQueueFieldsOperation } from '#tracker_api/api_operations/queue/get-queue-fields.operation.js';
import {
  createQueueFieldListFixture,
  createRequiredQueueFieldFixture,
  createStandardSystemFields,
} from '#helpers/queue-field.fixture.js';

describe('GetQueueFieldsOperation', () => {
  let operation: GetQueueFieldsOperation;
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

    operation = new GetQueueFieldsOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = createQueueFieldListFixture(3);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      const result = await operation.execute({ queueId: 'TEST' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues/TEST/fields');
      expect(result).toEqual(mockFields);
    });

    it('should return list of queue fields', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = createStandardSystemFields();
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      const result = await operation.execute({ queueId: 'PROJ' });

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('required');
      expect(result[0]).toHaveProperty('type');
    });

    it('should return only required fields', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = [
        createRequiredQueueFieldFixture({ key: 'summary', required: true }),
        createRequiredQueueFieldFixture({ key: 'description', required: true }),
      ];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      const result = await operation.execute({ queueId: 'TEST' });

      expect(result.every((field) => field.required === true)).toBe(true);
    });

    it('should handle empty result', async () => {
      const emptyResult: QueueFieldWithUnknownFields[] = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyResult);

      const result = await operation.execute({ queueId: 'EMPTY' });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should work with queue ID instead of key', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = createQueueFieldListFixture(2);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      await operation.execute({ queueId: 'queue-123' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues/queue-123/fields');
    });

    it('should handle API errors', async () => {
      const error = new Error('Queue not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute({ queueId: 'NOTFOUND' })).rejects.toThrow('Queue not found');
    });

    it('should log info messages', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = createQueueFieldListFixture(7);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      await operation.execute({ queueId: 'PROJ' });

      expect(mockLogger.info).toHaveBeenCalledWith('Получение обязательных полей очереди: PROJ');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 7 полей для очереди PROJ');
    });

    it('should return fields with different types', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = [
        createRequiredQueueFieldFixture({ key: 'summary', type: 'string' }),
        createRequiredQueueFieldFixture({ key: 'assignee', type: 'user' }),
        createRequiredQueueFieldFixture({ key: 'priority', type: 'select' }),
        createRequiredQueueFieldFixture({ key: 'dueDate', type: 'date' }),
      ];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      const result = await operation.execute({ queueId: 'TEST' });

      expect(result).toHaveLength(4);
      expect(result.map((f) => f.type)).toEqual(['string', 'user', 'select', 'date']);
    });

    it('should return fields with categories', async () => {
      const mockFields: QueueFieldWithUnknownFields[] = createStandardSystemFields();
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockFields);

      const result = await operation.execute({ queueId: 'TEST' });

      // Все системные поля должны иметь категорию
      expect(result.every((field) => field.category !== undefined)).toBe(true);
    });
  });
});
