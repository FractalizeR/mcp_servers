import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ComponentOutput } from '@tracker_api/dto/index.js';
import { CreateComponentOperation } from '@tracker_api/api_operations/component/create-component.operation.js';
import { createComponentFixture } from '../../../helpers/component.fixture.js';
import {
  createCreateComponentDto,
  createMinimalCreateComponentDto,
  createFullCreateComponentDto,
  createInvalidCreateComponentDto,
} from '../../../helpers/component-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('CreateComponentOperation', () => {
  let operation: CreateComponentOperation;
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

    operation = new CreateComponentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data', async () => {
      const dto = createCreateComponentDto({ name: 'Backend' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Backend',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute('QUEUE', dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/queues/QUEUE/components', dto);
      expect(result).toEqual(mockComponent);
    });

    it('should create component with minimal fields', async () => {
      const dto = createMinimalCreateComponentDto({ name: 'Minimal Component' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Minimal Component',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute('QUEUE', dto);

      expect(result.name).toBe('Minimal Component');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/queues/QUEUE/components', dto);
    });

    it('should create component with all fields', async () => {
      const dto = createFullCreateComponentDto({
        name: 'Full Component',
        description: 'Full description',
        lead: 'user-login',
        assignAuto: true,
      });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Full Component',
        description: 'Full description',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute('QUEUE', dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/queues/QUEUE/components', dto);
      expect(result).toEqual(mockComponent);
    });

    it('should validate component name (cannot be empty)', async () => {
      const invalidDto = createInvalidCreateComponentDto({ name: '' });

      await expect(operation.execute('QUEUE', invalidDto)).rejects.toThrow(
        'Название компонента обязательно'
      );

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should validate component name (cannot be whitespace only)', async () => {
      const dto = createCreateComponentDto({ name: '   ' });

      await expect(operation.execute('QUEUE', dto)).rejects.toThrow(
        'Название компонента обязательно'
      );

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should cache created component by its ID', async () => {
      const dto = createCreateComponentDto({ name: 'Backend' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: 'comp-123' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute('QUEUE', dto);

      const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, 'comp-123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(componentCacheKey, mockComponent);
    });

    it('should invalidate components list cache after creation', async () => {
      const dto = createCreateComponentDto({ name: 'Backend' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: '1' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute('QUEUE', dto);

      const listCacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'QUEUE/components');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should handle API errors', async () => {
      const dto = createCreateComponentDto({ name: 'Test' });
      const error = new Error('Component already exists');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute('QUEUE', dto)).rejects.toThrow('Component already exists');
    });

    it('should log info messages', async () => {
      const dto = createCreateComponentDto({ name: 'Backend' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Backend',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute('QUEUE', dto);

      expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента "Backend" в очереди QUEUE');
      expect(mockLogger.info).toHaveBeenCalledWith('Компонент успешно создан: Backend (ID: 1)');
    });

    it('should log debug message about cache invalidation', async () => {
      const dto = createCreateComponentDto({ name: 'Test' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: '1' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute('QUEUE', dto);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Инвалидирован кеш компонентов для очереди: QUEUE'
      );
    });

    it('should work with queue ID instead of key', async () => {
      const dto = createCreateComponentDto({ name: 'Component' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: '1' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute('queue-123', dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/queues/queue-123/components', dto);
    });

    it('should create component with assignAuto enabled', async () => {
      const dto = createCreateComponentDto({
        name: 'Auto-assign Component',
        assignAuto: true,
        lead: 'user-login',
      });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Auto-assign Component',
        assignAuto: true,
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute('QUEUE', dto);

      expect(result.assignAuto).toBe(true);
    });
  });
});
