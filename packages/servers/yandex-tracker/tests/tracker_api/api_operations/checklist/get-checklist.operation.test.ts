import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';
import { GetChecklistOperation } from '#tracker_api/api_operations/checklist/get-checklist.operation.js';

describe('GetChecklistOperation', () => {
  let operation: GetChecklistOperation;
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

    operation = new GetChecklistOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockChecklist: ChecklistItemWithUnknownFields[] = [
        {
          id: '1',
          text: 'First item',
          checked: false,
        },
        {
          id: '2',
          text: 'Second item',
          checked: true,
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChecklist);

      const result = await operation.execute('TEST-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems');
      expect(result).toEqual(mockChecklist);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if API returns non-array', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(
        null as unknown as ChecklistItemWithUnknownFields[]
      );

      const result = await operation.execute('TEST-2');

      expect(result).toEqual([]);
    });

    it('should return checklist with assignee and deadline', async () => {
      const mockChecklist: ChecklistItemWithUnknownFields[] = [
        {
          id: '3',
          text: 'Item with assignee',
          checked: false,
          assignee: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'John Doe',
          },
          deadline: '2025-12-31T23:59:59.000Z',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChecklist);

      const result = await operation.execute('PROJ-10');

      expect(result[0].assignee).toBeDefined();
      expect(result[0].assignee?.display).toBe('John Doe');
      expect(result[0].deadline).toBe('2025-12-31T23:59:59.000Z');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute('TEST-1')).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const mockChecklist: ChecklistItemWithUnknownFields[] = [
        { id: '1', text: 'Item', checked: false },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChecklist);

      await operation.execute('TEST-3');

      expect(mockLogger.info).toHaveBeenCalledWith('Получение чеклиста задачи TEST-3');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получено 1 элементов чеклиста для задачи TEST-3'
      );
    });
  });

  describe('executeMany', () => {
    it('должна получить чеклисты нескольких задач параллельно', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const checklist1: ChecklistItemWithUnknownFields[] = [
        { id: '1', text: 'Item 1', checked: false },
      ];
      const checklist2: ChecklistItemWithUnknownFields[] = [
        { id: '2', text: 'Item 2', checked: true },
        { id: '3', text: 'Item 3', checked: false },
      ];

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(checklist1)
        .mockResolvedValueOnce(checklist2);

      const result = await operation.executeMany(issueIds);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      expect(result[1].status).toBe('fulfilled');
      expect(result[1].key).toBe('TEST-2');
    });

    it('должна обработать частичные ошибки при получении чеклистов', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const checklist1: ChecklistItemWithUnknownFields[] = [
        { id: '1', text: 'Item 1', checked: false },
      ];

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(checklist1)
        .mockRejectedValueOnce(new Error('Issue not found'));

      const result = await operation.executeMany(issueIds);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      expect(result[1].status).toBe('rejected');
      expect(result[1].key).toBe('TEST-2');
      if (result[1].status === 'rejected') {
        expect(result[1].reason.message).toBe('Issue not found');
      }
    });

    it('должна вернуть пустой результат для пустого массива issueIds', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('должна логировать batch операцию', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const checklist: ChecklistItemWithUnknownFields[] = [
        { id: '1', text: 'Item', checked: false },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(checklist);

      await operation.executeMany(issueIds);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение чеклистов для 2 задач параллельно: TEST-1, TEST-2'
      );
    });

    it('должна вызвать корректные endpoints для каждой задачи', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const checklist: ChecklistItemWithUnknownFields[] = [
        { id: '1', text: 'Item', checked: false },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(checklist);

      await operation.executeMany(issueIds);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/issues/TEST-2/checklistItems');
    });
  });
});
