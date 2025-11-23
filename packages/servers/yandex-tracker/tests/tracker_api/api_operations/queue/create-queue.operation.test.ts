import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateQueueOperation } from '#tracker_api/api_operations/queue/create-queue.operation.js';
import { createQueueFixture } from '#helpers/queue.fixture.js';
import {
  createCreateQueueDto,
  createInvalidCreateQueueDto,
} from '#helpers/queue-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('CreateQueueOperation', () => {
  let operation: CreateQueueOperation;
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

    operation = new CreateQueueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data', async () => {
      const dto = createCreateQueueDto({ key: 'TEST', name: 'Test Queue' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'TEST',
        name: 'Test Queue',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockQueue);

      const result = await operation.execute(dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/queues/', dto);
      expect(result).toEqual(mockQueue);
    });

    it('should validate queue key format (must be A-Z, 2-10 characters)', async () => {
      const invalidDto = createInvalidCreateQueueDto({ key: 'test' }); // lowercase

      await expect(operation.execute(invalidDto)).rejects.toThrow(
        'Невалидный ключ очереди: test. Должен быть A-Z, 2-10 символов'
      );

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should reject queue key with less than 2 characters', async () => {
      const dto = createCreateQueueDto({ key: 'A' });

      await expect(operation.execute(dto)).rejects.toThrow(
        'Невалидный ключ очереди: A. Должен быть A-Z, 2-10 символов'
      );
    });

    it('should reject queue key with more than 10 characters', async () => {
      const dto = createCreateQueueDto({ key: 'VERYLONGKEY' }); // 11 символов

      await expect(operation.execute(dto)).rejects.toThrow(
        'Невалидный ключ очереди: VERYLONGKEY. Должен быть A-Z, 2-10 символов'
      );
    });

    it('should reject queue key with lowercase letters', async () => {
      const dto = createCreateQueueDto({ key: 'Test' });

      await expect(operation.execute(dto)).rejects.toThrow(
        'Невалидный ключ очереди: Test. Должен быть A-Z, 2-10 символов'
      );
    });

    it('should reject queue key with special characters', async () => {
      const dto = createCreateQueueDto({ key: 'TE-ST' });

      await expect(operation.execute(dto)).rejects.toThrow(
        'Невалидный ключ очереди: TE-ST. Должен быть A-Z, 2-10 символов'
      );
    });

    it('should accept valid queue key (2-10 uppercase letters)', async () => {
      const validKeys = ['AB', 'TEST', 'PROJECTONE'];

      for (const key of validKeys) {
        const dto = createCreateQueueDto({ key });
        const mockQueue: QueueWithUnknownFields = createQueueFixture({ key });
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockQueue);

        await expect(operation.execute(dto)).resolves.toBeDefined();
      }
    });

    it('should cache created queue by its key', async () => {
      const dto = createCreateQueueDto({ key: 'PROJ' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'PROJ' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockQueue);

      await operation.execute(dto);

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'PROJ');
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, mockQueue);
    });

    it('should handle API errors', async () => {
      const dto = createCreateQueueDto({ key: 'TEST' });
      const error = new Error('Queue already exists');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute(dto)).rejects.toThrow('Queue already exists');
    });

    it('should log info messages', async () => {
      const dto = createCreateQueueDto({ key: 'PROJ', name: 'Project Queue' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'PROJ',
        name: 'Project Queue',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockQueue);

      await operation.execute(dto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Создание очереди с ключом PROJ: "Project Queue"'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Очередь успешно создана: PROJ');
    });

    it('should create queue with all optional fields', async () => {
      const dto = createCreateQueueDto({
        key: 'FULL',
        name: 'Full Queue',
        description: 'Full queue description',
        issueTypes: ['1', '2', '3'],
      });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'FULL',
        name: 'Full Queue',
        description: 'Full queue description',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockQueue);

      const result = await operation.execute(dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/queues/', dto);
      expect(result).toEqual(mockQueue);
    });
  });
});
