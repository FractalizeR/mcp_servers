import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UpdateWorklogInput } from '#tracker_api/dto/index.js';
import { UpdateWorklogOperation } from '#tracker_api/api_operations/worklog/update-worklog.operation.js';

describe('UpdateWorklogOperation', () => {
  let operation: UpdateWorklogOperation;
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

    operation = new UpdateWorklogOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const input: UpdateWorklogInput = {
        duration: 'PT2H',
        comment: 'Обновленный комментарий',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/123',
        issue: {
          id: 'abc123',
          key: 'TEST-1',
          display: 'Test issue',
        },
        comment: 'Обновленный комментарий',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'Test User',
        },
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T11:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT2H',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-1', '123', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog/123', {
        duration: 'PT2H',
        comment: 'Обновленный комментарий',
      });
      expect(result).toEqual(mockWorklog);
    });

    it('should convert human-readable duration to ISO format', async () => {
      const input: UpdateWorklogInput = {
        duration: '2h 30m',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '456',
        self: 'https://api.tracker.yandex.net/v2/issues/PROJ-10/worklog/456',
        issue: {
          id: 'xyz456',
          key: 'PROJ-10',
          display: 'Project task',
        },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/2',
          id: '2',
          display: 'User Two',
        },
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v2/users/2',
          id: '2',
          display: 'User Two',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T12:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT2H30M',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      const result = await operation.execute('PROJ-10', '456', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/PROJ-10/worklog/456', {
        duration: 'PT2H30M',
      });
      expect(result.duration).toBe('PT2H30M');
    });

    it('should update only comment field', async () => {
      const input: UpdateWorklogInput = {
        comment: 'Только обновление комментария',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '789',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-2/worklog/789',
        issue: {
          id: 'def789',
          key: 'TEST-2',
          display: 'Another task',
        },
        comment: 'Только обновление комментария',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/3',
          id: '3',
          display: 'User Three',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-2', '789', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-2/worklog/789', {
        comment: 'Только обновление комментария',
      });
      expect(result.comment).toBe('Только обновление комментария');
    });

    it('should update only start field', async () => {
      const input: UpdateWorklogInput = {
        start: '2025-01-18T12:00:00.000+0000',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '111',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-3/worklog/111',
        issue: {
          id: 'ghi012',
          key: 'TEST-3',
          display: 'Test task',
        },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'User One',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T12:00:00.000+0000',
        duration: 'PT1H30M',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-3', '111', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-3/worklog/111', {
        start: '2025-01-18T12:00:00.000+0000',
      });
      expect(result.start).toBe('2025-01-18T12:00:00.000+0000');
    });

    it('should update all fields', async () => {
      const input: UpdateWorklogInput = {
        start: '2025-01-18T14:00:00.000+0000',
        duration: '3h',
        comment: 'Полное обновление',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '222',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-4/worklog/222',
        issue: {
          id: 'jkl345',
          key: 'TEST-4',
          display: 'Test task 4',
        },
        comment: 'Полное обновление',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'User One',
        },
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'User One',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedAt: '2025-01-18T15:00:00.000+0000',
        start: '2025-01-18T14:00:00.000+0000',
        duration: 'PT3H',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-4', '222', input);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/issues/TEST-4/worklog/222', {
        start: '2025-01-18T14:00:00.000+0000',
        duration: 'PT3H',
        comment: 'Полное обновление',
      });
      expect(result).toEqual(mockWorklog);
    });

    it('should handle API errors', async () => {
      const input: UpdateWorklogInput = {
        duration: 'PT1H',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123', input)).rejects.toThrow('API Error');
    });

    it('should log info and debug messages', async () => {
      const input: UpdateWorklogInput = {
        duration: 'PT2H',
        comment: 'Updated comment',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '999',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-5/worklog/999',
        issue: {
          id: 'mno678',
          key: 'TEST-5',
          display: 'Test task 5',
        },
        comment: 'Updated comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'User One',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT2H',
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockWorklog);

      await operation.execute('TEST-5', '999', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Обновление записи времени 999 задачи TEST-5');
      expect(mockLogger.debug).toHaveBeenCalledWith('Payload для API:', {
        issueId: 'TEST-5',
        worklogId: '999',
        start: undefined,
        duration: 'PT2H',
        hasComment: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Запись времени 999 задачи TEST-5 успешно обновлена'
      );
    });
  });
});
