import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { QueuePermissionsWithUnknownFields } from '#tracker_api/entities/index.js';
import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
import { createQueuePermissionsFixture } from '#helpers/queue-permission.fixture.js';
import {
  createManageQueueAccessDto,
  createRemoveQueueAccessDto,
} from '#helpers/queue-dto.fixture.js';

describe('ManageQueueAccessOperation', () => {
  let operation: ManageQueueAccessOperation;
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

    operation = new ManageQueueAccessOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should build body for each of the five permissions', async () => {
      const permissions = ['create', 'write', 'read', 'grant', 'deny'] as const;
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      for (const permission of permissions) {
        const accessData = createManageQueueAccessDto({
          permission,
          subjectKind: 'users',
          action: 'add',
          subjects: ['user-1'],
        });

        await operation.execute({ queueId: 'TEST', accessData });

        expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
          [permission]: { users: { add: ['user-1'] } },
        });
      }
    });

    it('should build body for each of the three subject kinds', async () => {
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      const cases: readonly [
        subjectKind: 'users' | 'groups' | 'roles',
        subjects: (string | number)[],
      ][] = [
        ['users', ['user-1']],
        ['groups', [42]],
        ['roles', ['assignee']],
      ];

      for (const [subjectKind, subjects] of cases) {
        const accessData = createManageQueueAccessDto({
          permission: 'write',
          subjectKind,
          action: 'add',
          subjects,
        });

        await operation.execute({ queueId: 'TEST', accessData });

        expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
          write: { [subjectKind]: { add: subjects } },
        });
      }
    });

    it('should send group id as a number, not a string, in the body', async () => {
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      const accessData = createManageQueueAccessDto({
        permission: 'write',
        subjectKind: 'groups',
        action: 'add',
        subjects: [36],
      });

      await operation.execute({ queueId: 'TEST', accessData });

      const [, body] = vi.mocked(mockHttpClient.patch).mock.calls[0] as [string, unknown];
      const groups = (body as { write: { groups: { add: unknown[] } } }).write.groups.add;
      expect(groups).toEqual([36]);
      expect(typeof groups[0]).toBe('number');
    });

    it('should remove subjects with correct payload', async () => {
      const accessData = createRemoveQueueAccessDto('write', ['user-3', 'user-4']);
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'PROJ', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/PROJ/permissions', {
        write: {
          users: { remove: ['user-3', 'user-4'] },
        },
      });
    });

    it('should handle multiple subjects in one request', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        permission: 'write',
        subjectKind: 'users',
        subjects: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
      });
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        write: {
          users: { add: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'] },
        },
      });
    });

    it('should handle API errors', async () => {
      const accessData = createManageQueueAccessDto();
      const error = new Error('Permission denied');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute({ queueId: 'TEST', accessData })).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should log info messages for add action', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        permission: 'write',
        subjectKind: 'users',
        subjects: ['user-1', 'user-2'],
      });
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'PROJ', accessData });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление субъектов user-1, user-2 (users) для разрешения write очереди PROJ'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Права доступа успешно обновлены для очереди PROJ (add 2 субъектов)'
      );
    });

    it('should log info messages for remove action', async () => {
      const accessData = createRemoveQueueAccessDto('write', ['user-3']);
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление субъектов user-3 (users) для разрешения write очереди TEST'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Права доступа успешно обновлены для очереди TEST (remove 1 субъектов)'
      );
    });

    it('should work with queue ID instead of key', async () => {
      const accessData = createManageQueueAccessDto();
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'queue-123', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        '/v3/queues/queue-123/permissions',
        expect.any(Object)
      );
    });

    it('should return permissions after update', async () => {
      const accessData = createManageQueueAccessDto();
      const mockPermissions: QueuePermissionsWithUnknownFields = createQueuePermissionsFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      const result = await operation.execute({ queueId: 'TEST', accessData });

      expect(result).toEqual(mockPermissions);
      expect(result.write?.users).toHaveLength(1);
    });
  });
});
