import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { UpdateChecklistItemOperation } from '#tracker_api/api_operations/checklist/update-checklist-item.operation.js';
import { createUserRef } from '#helpers/common-fixtures.js';

/**
 * Ответ API v2 на PATCH элемента чеклиста — это ЗАДАЧА целиком, элемент лежит
 * в `checklistItems` (живая проба 2026-08-20). Прежние моки отдавали голый
 * элемент, поэтому тесты были зелёными, пока продакшн возвращал агенту id
 * задачи вместо id элемента.
 */
function issueResponse(...items: ChecklistItemWithUnknownFields[]): unknown {
  return { id: 'issue-internal-id', key: 'TEST-1', checklistItems: items };
}

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

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

      const result = await operation.execute('TEST-1', '123', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems/123', {
        text: 'Updated item text',
      });
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

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

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

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

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

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

      await operation.execute('TEST-3', '999', input);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Обновление элемента 999 чеклиста задачи TEST-3'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент 999 чеклиста задачи TEST-3 успешно обновлён'
      );
    });
  });

  describe('регрессия: ответ PATCH — задача, а не элемент', () => {
    // Живая проба 2026-08-20: инструмент отдавал агенту id ЗАДАЧИ вместо id
    // элемента и терял text/checked/deadline.
    it('возвращает элемент по его id, а не корень ответа', async () => {
      const target: ChecklistItemWithUnknownFields = {
        id: 'item-2',
        text: 'Пункт 2 обновлён',
        checked: true,
      };
      const other: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Пункт 1',
        checked: false,
      };
      vi.mocked(mockHttpClient.patch).mockResolvedValue({
        id: 'issue-internal-id',
        key: 'TEST-1',
        checklistItems: [other, target],
      });

      const result = await operation.execute('TEST-1', 'item-2', { checked: true });

      expect(result).toEqual(target);
      expect(result.id).not.toBe('issue-internal-id');
    });

    it('падает явно, если элемента нет в ответе', async () => {
      vi.mocked(mockHttpClient.patch).mockResolvedValue({
        id: 'issue-internal-id',
        checklistItems: [],
      });

      await expect(operation.execute('TEST-1', 'item-2', { checked: true })).rejects.toThrow(
        /не вернул обновлённый элемент item-2/
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
        .mockResolvedValueOnce(issueResponse(mockItem1))
        .mockResolvedValueOnce(issueResponse(mockItem2));

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
        .mockResolvedValueOnce(issueResponse(mockItem))
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
        assignee: createUserRef({ id: 'user1', display: 'User 1' }),
        deadline: '2025-12-31',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

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
        deadline: { date: '2025-12-31', deadlineType: 'date' },
      });
    });

    it('регрессия: строковый deadline (баг Tool execution failed) оборачивается в {date, deadlineType}', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
        deadline: '2026-08-25T00:00:00.000+0000',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

      await operation.executeMany([
        {
          issueId: 'TEST-1',
          checklistItemId: 'item-1',
          deadline: '2026-08-25T00:00:00.000+0000',
        },
      ]);

      const [, body] = vi.mocked(mockHttpClient.patch).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body['deadline']).toEqual({
        date: '2026-08-25T00:00:00.000+0000',
        deadlineType: 'date',
      });
    });

    it('update без deadline: ключ deadline отсутствует в теле (существующее значение не затирается)', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Renamed',
        checked: false,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

      await operation.executeMany([
        { issueId: 'TEST-1', checklistItemId: 'item-1', text: 'Renamed' },
      ]);

      const [, body] = vi.mocked(mockHttpClient.patch).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body).not.toHaveProperty('deadline');
      expect(body).toEqual({ text: 'Renamed' });
    });

    it('should log batch operation start', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(issueResponse(mockItem));

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
