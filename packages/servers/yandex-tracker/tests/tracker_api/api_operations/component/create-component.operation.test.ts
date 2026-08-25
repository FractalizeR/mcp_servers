import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ComponentOutput } from '#tracker_api/dto/index.js';
import { CreateComponentOperation } from '#tracker_api/api_operations/component/create-component.operation.js';
import { createComponentFixture } from '#helpers/component.fixture.js';
import {
  createCreateComponentDto,
  createMinimalCreateComponentDto,
  createFullCreateComponentDto,
  createInvalidCreateComponentDto,
} from '#helpers/component-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

describe('CreateComponentOperation', () => {
  let operation: CreateComponentOperation;
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

    operation = new CreateComponentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with /v3/components and body containing queue', async () => {
      const dto = createCreateComponentDto({ name: 'Backend', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: 1,
        name: 'Backend',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute(dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/components', dto);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/components',
        expect.objectContaining({ queue: 'QUEUE' })
      );
      expect(result).toEqual(mockComponent);
    });

    it('should create component with minimal fields', async () => {
      const dto = createMinimalCreateComponentDto({ name: 'Minimal Component', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: 1,
        name: 'Minimal Component',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute(dto);

      expect(result.name).toBe('Minimal Component');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/components', dto);
    });

    it('should create component with all fields', async () => {
      const dto = createFullCreateComponentDto({
        name: 'Full Component',
        queue: 'QUEUE',
        description: 'Full description',
        lead: 'user-login',
        assignAuto: true,
      });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: 1,
        name: 'Full Component',
        description: 'Full description',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute(dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/components', dto);
      expect(result).toEqual(mockComponent);
    });

    it('should validate component name (cannot be empty)', async () => {
      const invalidDto = createInvalidCreateComponentDto({ name: '', queue: 'QUEUE' });

      await expect(operation.execute(invalidDto)).rejects.toThrow(
        'Название компонента обязательно'
      );

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should validate component name (cannot be whitespace only)', async () => {
      const dto = createCreateComponentDto({ name: '   ', queue: 'QUEUE' });

      await expect(operation.execute(dto)).rejects.toThrow('Название компонента обязательно');

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should cache created component by its ID', async () => {
      const dto = createCreateComponentDto({ name: 'Backend', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: 123 });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute(dto);

      const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, '123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(componentCacheKey, mockComponent);
    });

    it('should invalidate components list cache after creation', async () => {
      const dto = createCreateComponentDto({ name: 'Backend', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: 1 });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute(dto);

      const listCacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'QUEUE/components');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should handle API errors', async () => {
      const dto = createCreateComponentDto({ name: 'Test', queue: 'QUEUE' });
      const error = new Error('Component already exists');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute(dto)).rejects.toThrow('Component already exists');
    });

    it('should log info messages', async () => {
      const dto = createCreateComponentDto({ name: 'Backend', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: 1,
        name: 'Backend',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute(dto);

      expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента "Backend" в очереди QUEUE');
      expect(mockLogger.info).toHaveBeenCalledWith('Компонент успешно создан: Backend (ID: 1)');
    });

    it('should log debug message about cache invalidation', async () => {
      const dto = createCreateComponentDto({ name: 'Test', queue: 'QUEUE' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: 1 });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute(dto);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Инвалидирован кеш компонентов для очереди: QUEUE'
      );
    });

    it('should work with queue ID instead of key', async () => {
      const dto = createCreateComponentDto({ name: 'Component', queue: 'queue-123' });
      const mockComponent: ComponentOutput = createComponentFixture({ id: 1 });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      await operation.execute(dto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/components', dto);
    });

    it('should create component with assignAuto enabled', async () => {
      const dto = createCreateComponentDto({
        name: 'Auto-assign Component',
        queue: 'QUEUE',
        assignAuto: true,
        lead: 'user-login',
      });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: 1,
        name: 'Auto-assign Component',
        assignAuto: true,
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockComponent);

      const result = await operation.execute(dto);

      expect(result.assignAuto).toBe(true);
    });
  });
});
