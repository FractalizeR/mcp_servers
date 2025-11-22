import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueuePermissionWithUnknownFields } from '#tracker_api/entities/index.js';
import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
import { createQueuePermissionListFixture } from '#helpers/queue-permission.fixture.js';
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

    operation = new ManageQueueAccessOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should add users to role with correct payload', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'team-member',
        subjects: ['user-1', 'user-2'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(2);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        'team-member': {
          add: ['user-1', 'user-2'],
        },
      });
    });

    it('should remove users from role with correct payload', async () => {
      const accessData = createRemoveQueueAccessDto('follower', ['user-3', 'user-4']);
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(0);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'PROJ', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/PROJ/permissions', {
        follower: {
          remove: ['user-3', 'user-4'],
        },
      });
    });

    it('should support queue-lead role', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'queue-lead',
        subjects: ['lead-user'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(1);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        'queue-lead': {
          add: ['lead-user'],
        },
      });
    });

    it('should support team-member role', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'team-member',
        subjects: ['member-1'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(1);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'PROJ', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/PROJ/permissions', {
        'team-member': {
          add: ['member-1'],
        },
      });
    });

    it('should support follower role', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'follower',
        subjects: ['follower-1'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(1);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        follower: {
          add: ['follower-1'],
        },
      });
    });

    it('should support access role', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'access',
        subjects: ['access-user-1'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(1);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        access: {
          add: ['access-user-1'],
        },
      });
    });

    it('should handle multiple users in one request', async () => {
      const accessData = createManageQueueAccessDto({
        action: 'add',
        role: 'team-member',
        subjects: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(5);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST/permissions', {
        'team-member': {
          add: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
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
        role: 'team-member',
        subjects: ['user-1', 'user-2'],
      });
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(2);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'PROJ', accessData });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление пользователей user-1, user-2 в роли team-member для очереди PROJ'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Права доступа успешно обновлены для очереди PROJ (add 2 пользователей)'
      );
    });

    it('should log info messages for remove action', async () => {
      const accessData = createRemoveQueueAccessDto('follower', ['user-3']);
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(0);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'TEST', accessData });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление пользователей user-3 из роли follower для очереди TEST'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Права доступа успешно обновлены для очереди TEST (remove 1 пользователей)'
      );
    });

    it('should work with queue ID instead of key', async () => {
      const accessData = createManageQueueAccessDto();
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(1);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      await operation.execute({ queueId: 'queue-123', accessData });

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        '/v3/queues/queue-123/permissions',
        expect.any(Object)
      );
    });

    it('should return permissions list after update', async () => {
      const accessData = createManageQueueAccessDto();
      const mockPermissions: QueuePermissionWithUnknownFields[] =
        createQueuePermissionListFixture(3);
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockPermissions);

      const result = await operation.execute({ queueId: 'TEST', accessData });

      expect(result).toEqual(mockPermissions);
      expect(result).toHaveLength(3);
    });
  });
});
