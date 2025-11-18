import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetChecklistOperation } from '@tracker_api/api_operations/checklist/get-checklist.operation.js';

describe('GetChecklistOperation', () => {
  let operation: GetChecklistOperation;
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

    operation = new GetChecklistOperation(mockHttpClient, mockCacheManager, mockLogger);
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
      expect(mockLogger.error).toHaveBeenCalled();
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
});
