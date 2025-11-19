import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';
import type { UpdateChecklistItemInput } from '@tracker_api/dto/index.js';
import { UpdateChecklistItemOperation } from '@tracker_api/api_operations/checklist/update-checklist-item.operation.js';

describe('UpdateChecklistItemOperation', () => {
  let operation: UpdateChecklistItemOperation;
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

    operation = new UpdateChecklistItemOperation(mockHttpClient, mockCacheManager, mockLogger);
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
});
