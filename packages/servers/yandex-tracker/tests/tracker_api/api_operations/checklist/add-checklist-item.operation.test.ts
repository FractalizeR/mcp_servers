import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { AddChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { AddChecklistItemOperation } from '#tracker_api/api_operations/checklist/add-checklist-item.operation.js';

describe('AddChecklistItemOperation', () => {
  let operation: AddChecklistItemOperation;
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

    operation = new AddChecklistItemOperation(
      mockHttpClient,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data', async () => {
      const input: AddChecklistItemInput = {
        text: 'New checklist item',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '123',
        text: 'New checklist item',
        checked: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      const result = await operation.execute('TEST-1', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems', {
        text: 'New checklist item',
      });
      expect(result).toEqual(mockItem);
    });

    it('should add item with all optional fields', async () => {
      const input: AddChecklistItemInput = {
        text: 'Complete task',
        checked: true,
        assignee: 'user123',
        deadline: '2025-12-31T23:59:59.000Z',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '456',
        text: 'Complete task',
        checked: true,
        assignee: {
          self: 'https://api.tracker.yandex.net/v2/users/user123',
          id: 'user123',
          display: 'John Doe',
        },
        deadline: '2025-12-31T23:59:59.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      const result = await operation.execute('PROJ-10', input);

      expect(result.checked).toBe(true);
      expect(result.assignee?.id).toBe('user123');
      expect(result.deadline).toBe('2025-12-31T23:59:59.000Z');
    });

    it('should handle API errors', async () => {
      const input: AddChecklistItemInput = {
        text: 'Test item',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', input)).rejects.toThrow('API Error');
    });

    it('извлекает созданный элемент из checklistItems, а не id задачи (регрессия itemId)', async () => {
      const input: AddChecklistItemInput = { text: 'New item' };

      // Реальный ответ API v2 — ОБНОВЛЁННАЯ задача: корневой id — это id задачи,
      // созданный элемент лежит последним в checklistItems.
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        id: 'issue-id',
        checklistItems: [
          { id: 'old-item', text: 'Old', checked: false },
          { id: 'new-item', text: 'New item', checked: false },
        ],
      });

      const result = await operation.execute('TEST-1', input);

      expect(result.id).toBe('new-item');
      expect(result.text).toBe('New item');
    });

    it('should log info messages', async () => {
      const input: AddChecklistItemInput = {
        text: 'Test item',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '789',
        text: 'Test item',
        checked: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      await operation.execute('TEST-2', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Добавление элемента в чеклист задачи TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент успешно добавлен в чеклист задачи TEST-2: 789'
      );
    });
  });

  describe('executeMany', () => {
    it('should return empty array for empty input', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AddChecklistItemOperation: пустой массив элементов'
      );
    });

    it('should add items to multiple issues in parallel', async () => {
      const mockItem1: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };
      const mockItem2: ChecklistItemWithUnknownFields = {
        id: 'item-2',
        text: 'Item 2',
        checked: true,
      };

      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({ checklistItems: [mockItem1] })
        .mockResolvedValueOnce({ checklistItems: [mockItem2] });

      const result = await operation.executeMany([
        { issueId: 'TEST-1', text: 'Item 1' },
        { issueId: 'TEST-2', text: 'Item 2', checked: true },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1',
        value: mockItem1,
      });
      expect(result[1]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-2',
        value: mockItem2,
      });
    });

    it('should handle partial failures', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };

      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce({ checklistItems: [mockItem] })
        .mockRejectedValueOnce(new Error('Issue not found'));

      const result = await operation.executeMany([
        { issueId: 'TEST-1', text: 'Item 1' },
        { issueId: 'NONEXISTENT-1', text: 'Item 2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1',
      });
      expect(result[1]).toMatchObject({
        status: 'rejected',
        key: 'NONEXISTENT-1',
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

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      await operation.executeMany([
        {
          issueId: 'TEST-1',
          text: 'Item 1',
          checked: true,
          assignee: 'user1',
          deadline: '2025-12-31',
        },
      ]);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems', {
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
        deadline: '2026-08-25',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      await operation.executeMany([{ issueId: 'TEST-1', text: 'Item 1', deadline: '2026-08-25' }]);

      const [, body] = vi.mocked(mockHttpClient.post).mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body['deadline']).toEqual({ date: '2026-08-25', deadlineType: 'date' });
      expect(typeof body['deadline']).toBe('object');
    });

    it('should log batch operation start', async () => {
      const mockItem: ChecklistItemWithUnknownFields = {
        id: 'item-1',
        text: 'Item 1',
        checked: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue({ checklistItems: [mockItem] });

      await operation.executeMany([
        { issueId: 'TEST-1', text: 'Item 1' },
        { issueId: 'TEST-2', text: 'Item 2' },
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление элементов в чеклисты 2 задач параллельно: TEST-1, TEST-2'
      );
    });
  });
});
