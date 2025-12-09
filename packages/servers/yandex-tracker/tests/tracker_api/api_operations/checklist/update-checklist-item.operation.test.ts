import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { UpdateChecklistItemOperation } from '#tracker_api/api_operations/checklist/update-checklist-item.operation.js';

describe('UpdateChecklistItemOperation', () => {
  let operation: UpdateChecklistItemOperation;
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

    operation = new UpdateChecklistItemOperation(
      mockHttpClient,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const input: UpdateChecklistItemInput = {
        text: 'Updated item text',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '123',
        text: 'Updated item text',
        checked: false,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      const result = await operation.execute('TEST-1', '123', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        '/v2/issues/TEST-1/checklistItems/123',
        input
      );
      expect(result).toEqual(mockItem);
    });

    it('should update only checked status', async () => {
      const input: UpdateChecklistItemInput = {
        checked: true,
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '456',
        text: 'Existing text',
        checked: true,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      const result = await operation.execute('PROJ-10', '456', input);

      expect(result.checked).toBe(true);
      expect(result.text).toBe('Existing text');
    });

    it('should update multiple fields at once', async () => {
      const input: UpdateChecklistItemInput = {
        text: 'New text',
        checked: true,
        assignee: 'user456',
        deadline: '2026-01-01T00:00:00.000Z',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '789',
        text: 'New text',
        checked: true,
        assignee: {
          self: 'https://api.tracker.yandex.net/v2/users/user456',
          id: 'user456',
          display: 'Jane Smith',
        },
        deadline: '2026-01-01T00:00:00.000Z',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      const result = await operation.execute('TEST-5', '789', input);

      expect(result.text).toBe('New text');
      expect(result.checked).toBe(true);
      expect(result.assignee?.display).toBe('Jane Smith');
      expect(result.deadline).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should handle API errors', async () => {
      const input: UpdateChecklistItemInput = {
        text: 'Test',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123', input)).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const input: UpdateChecklistItemInput = {
        checked: true,
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '999',
        text: 'Item',
        checked: true,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      await operation.execute('TEST-3', '999', input);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента 999 чеклиста задачи TEST-3'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент 999 чеклиста задачи TEST-3 успешно обновлён'
      );
    });
  });

  describe('executeMany', () => {
    it('should return empty array for empty input', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'UpdateChecklistItemOperation: пустой массив элементов'
      );
    });

    it('should update items in multiple issues in parallel', async () => {
      const mockItem1: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Updated Item 1',
        checked: false,
      };
      const mockItem2: ChecklistItemWithUnknownFields = {
        id: 'item-2',
        text: 'Item 2',
        checked: true,
      };

      vi.mocked(mockHttpClient.patch)
        .mockResolvedValueOnce(mockItem1)
        .mockResolvedValueOnce(mockItem2);

      const result = await operation.executeMany([
        { issueId: 'TEST-1', checklistItemId: 'item-1', text: 'Updated Item 1' },
        { issueId: 'TEST-2', checklistItemId: 'item-2', checked: true },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1/item-1',
        value: mockItem1,
      });
      expect(result[1]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-2/item-2',
        value: mockItem2,
      });
    });

    it('should handle partial failures', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };

      vi.mocked(mockHttpClient.patch)
        .mockResolvedValueOnce(mockItem)
        .mockRejectedValueOnce(new Error('Item not found'));

      const result = await operation.executeMany([
        { issueId: 'TEST-1', checklistItemId: 'item-1', text: 'Item 1' },
        { issueId: 'NONEXISTENT-1', checklistItemId: 'item-2', text: 'Item 2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1/item-1',
      });
      expect(result[1]).toMatchObject({
        status: 'rejected',
        key: 'NONEXISTENT-1/item-2',
      });
    });

    it('should pass all optional parameters', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: true,
        assignee: { id: 'user1', display: 'User 1' },
        deadline: '2025-12-31',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      await operation.executeMany([
        {
          issueId: 'TEST-1',
          checklistItemId: 'item-1',
          text: 'Item 1',
          checked: true,
          assignee: 'user1',
          deadline: '2025-12-31',
        },
      ]);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems/item-1', {
        text: 'Item 1',
        checked: true,
        assignee: 'user1',
        deadline: '2025-12-31',
      });
    });

    it('should log batch operation start', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockItem);

      await operation.executeMany([
        { issueId: 'TEST-1', checklistItemId: 'item-1', text: 'Item 1' },
        { issueId: 'TEST-2', checklistItemId: 'item-2', text: 'Item 2' },
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элементов чеклистов 2 задач параллельно: TEST-1/item-1, TEST-2/item-2'
      );
    });
  });
});
