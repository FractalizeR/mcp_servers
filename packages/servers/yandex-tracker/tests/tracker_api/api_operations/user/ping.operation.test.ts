import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PingOperation } from '#tracker_api/api_operations/user/ping.operation.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { User } from '#tracker_api/entities/user.entity.js';
import type { ApiError } from '@fractalizer/mcp-infrastructure/types.js';
import { HttpStatusCode } from '@fractalizer/mcp-infrastructure/types.js';
import type { ServerConfig } from '#config';

describe('PingOperation', () => {
  let operation: PingOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    // Mock HttpClient
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

    // Mock CacheManager - по умолчанию возвращает undefined (нет кеша)
    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    } as unknown as CacheManager;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    // Mock ServerConfig (принимается в конструкторе, но не используется)
    mockConfig = {
      token: 'test-token',
      apiBase: 'https://api.tracker.yandex.net',
      logLevel: 'info',
      requestTimeout: 10000,
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
      logsDir: './logs',
      prettyLogs: false,
      logMaxSize: 51200,
      logMaxFiles: 20,
    } as ServerConfig;

    operation = new PingOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('должна успешно выполнить проверку подключения', async () => {
      // Arrange
      const mockUser: User = {
        uid: '123',
        display: 'Test User',
        login: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUser);

      // Act
      const result = await operation.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test User');
      expect(result.message).toContain('v3');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Проверка подключения к API Яндекс.Трекера (v3)...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Подключение успешно', { user: 'Test User' });
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/myself');
    });

    it('должна использовать кеш при повторном вызове', async () => {
      // Arrange
      const mockUser: User = {
        uid: '456',
        display: 'Cached User',
        login: 'cacheduser',
        email: 'cached@example.com',
        firstName: 'Cached',
        lastName: 'User',
        isActive: true,
      };

      // Первый раз кеша нет
      vi.mocked(mockCacheManager.get).mockResolvedValueOnce(null);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUser);

      // Act - первый вызов
      const result1 = await operation.execute();

      // Второй раз данные из кеша
      vi.mocked(mockCacheManager.get).mockResolvedValueOnce(mockUser);

      // Act - второй вызов
      const result2 = await operation.execute();

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.message).toContain('Cached User');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1); // HTTP запрос только один раз
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('должна обработать ошибку подключения', async () => {
      // Arrange
      const apiError: ApiError = {
        statusCode: HttpStatusCode.UNAUTHORIZED,
        message: 'Unauthorized',
        errors: {},
      };

      vi.mocked(mockHttpClient.get).mockRejectedValue(apiError);

      // Act
      const result = await operation.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка подключения');
      expect(result.message).toContain('Unauthorized');
      expect(result.message).toContain('401');
    });

    it('должна обработать сетевую ошибку', async () => {
      // Arrange
      const networkError: ApiError = {
        statusCode: HttpStatusCode.NETWORK_ERROR,
        message: 'Network timeout',
      };

      vi.mocked(mockHttpClient.get).mockRejectedValue(networkError);

      // Act
      const result = await operation.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network timeout');
    });
  });
});
