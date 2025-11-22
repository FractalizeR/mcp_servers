import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { AddChecklistItemInput } from '#tracker_api/dto/index.js';
import { AddChecklistItemOperation } from '#tracker_api/api_operations/checklist/add-checklist-item.operation.js';

describe('AddChecklistItemOperation', () => {
  let operation: AddChecklistItemOperation;
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
    } as unknown as HttpClient;

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

    operation = new AddChecklistItemOperation(mockHttpClient, mockCacheManager, mockLogger);
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

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockItem);

      const result = await operation.execute('TEST-1', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems', input);
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

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockItem);

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

    it('should log info messages', async () => {
      const input: AddChecklistItemInput = {
        text: 'Test item',
      };

      const mockItem: ChecklistItemWithUnknownFields = {
        id: '789',
        text: 'Test item',
        checked: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockItem);

      await operation.execute('TEST-2', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Добавление элемента в чеклист задачи TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент успешно добавлен в чеклист задачи TEST-2: 789'
      );
    });
  });
});
