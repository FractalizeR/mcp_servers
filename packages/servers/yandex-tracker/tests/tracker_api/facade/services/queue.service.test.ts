/**
 * Unit tests for QueueService
 *
 * Проверяет:
 * - Конструктор с 6 параметрами (операциями)
 * - Делегирование вызовов соответствующим операциям
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueService } from '#tracker_api/facade/services/queue.service.js';
import type { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import type { GetQueueOperation } from '#tracker_api/api_operations/queue/get-queue.operation.js';
import type { CreateQueueOperation } from '#tracker_api/api_operations/queue/create-queue.operation.js';
import type { UpdateQueueOperation } from '#tracker_api/api_operations/queue/update-queue.operation.js';
import type { GetQueueFieldsOperation } from '#tracker_api/api_operations/queue/get-queue-fields.operation.js';
import type { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
import type {
  GetQueuesDto,
  GetQueueDto,
  CreateQueueDto,
  GetQueueFieldsDto,
  QueueOutput,
  QueuesListOutput,
  QueueFieldsOutput,
  QueuePermissionsOutput,
} from '#tracker_api/dto/index.js';
import type {
  UpdateQueueParams,
  ManageQueueAccessParams,
} from '#tracker_api/api_operations/index.js';

// Fixtures
function createQueueFixture(overrides = {}): QueueOutput {
  return {
    id: '1',
    self: 'https://api.tracker.yandex.net/v3/queues/TEST',
    key: 'TEST',
    name: 'Test Queue',
    lead: { uid: '1', display: 'Lead User', login: 'lead', isActive: true },
    ...overrides,
  };
}

function createQueueFieldFixture(overrides = {}) {
  return {
    id: 'field1',
    self: 'https://api.tracker.yandex.net/v3/fields/field1',
    key: 'field1',
    name: 'Field 1',
    ...overrides,
  };
}

describe('QueueService', () => {
  let service: QueueService;
  let mockGetQueuesOp: GetQueuesOperation;
  let mockGetQueueOp: GetQueueOperation;
  let mockCreateQueueOp: CreateQueueOperation;
  let mockUpdateQueueOp: UpdateQueueOperation;
  let mockGetQueueFieldsOp: GetQueueFieldsOperation;
  let mockManageQueueAccessOp: ManageQueueAccessOperation;

  beforeEach(() => {
    mockGetQueuesOp = { execute: vi.fn() } as unknown as GetQueuesOperation;
    mockGetQueueOp = { execute: vi.fn() } as unknown as GetQueueOperation;
    mockCreateQueueOp = { execute: vi.fn() } as unknown as CreateQueueOperation;
    mockUpdateQueueOp = { execute: vi.fn() } as unknown as UpdateQueueOperation;
    mockGetQueueFieldsOp = { execute: vi.fn() } as unknown as GetQueueFieldsOperation;
    mockManageQueueAccessOp = { execute: vi.fn() } as unknown as ManageQueueAccessOperation;

    service = new QueueService(
      mockGetQueuesOp,
      mockGetQueueOp,
      mockCreateQueueOp,
      mockUpdateQueueOp,
      mockGetQueueFieldsOp,
      mockManageQueueAccessOp
    );
  });

  describe('constructor', () => {
    it('должен создать сервис с 6 операциями', () => {
      expect(service).toBeDefined();
      expect(service.getQueues).toBeDefined();
      expect(service.getQueue).toBeDefined();
      expect(service.createQueue).toBeDefined();
      expect(service.updateQueue).toBeDefined();
      expect(service.getQueueFields).toBeDefined();
      expect(service.manageQueueAccess).toBeDefined();
    });
  });

  describe('getQueues', () => {
    it('должен делегировать вызов GetQueuesOperation без параметров', async () => {
      const mockResult: QueuesListOutput = [createQueueFixture()];

      vi.mocked(mockGetQueuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.getQueues();

      expect(mockGetQueuesOp.execute).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockResult);
    });

    it('должен делегировать вызов GetQueuesOperation с параметрами', async () => {
      const params: GetQueuesDto = { perPage: 50, page: 2 };
      const mockResult: QueuesListOutput = [createQueueFixture()];

      vi.mocked(mockGetQueuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.getQueues(params);

      expect(mockGetQueuesOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен возвращать пустой массив если очередей нет', async () => {
      vi.mocked(mockGetQueuesOp.execute).mockResolvedValue([]);

      const result = await service.getQueues();

      expect(result).toEqual([]);
    });
  });

  describe('getQueue', () => {
    it('должен делегировать вызов GetQueueOperation', async () => {
      const params: GetQueueDto = { queueId: 'TEST' };
      const mockResult: QueueOutput = createQueueFixture();

      vi.mocked(mockGetQueueOp.execute).mockResolvedValue(mockResult);

      const result = await service.getQueue(params);

      expect(mockGetQueueOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен поддерживать expand параметр', async () => {
      const params: GetQueueDto = { queueId: 'TEST', expand: 'projects' };
      const mockResult: QueueOutput = createQueueFixture();

      vi.mocked(mockGetQueueOp.execute).mockResolvedValue(mockResult);

      await service.getQueue(params);

      expect(mockGetQueueOp.execute).toHaveBeenCalledWith(params);
    });

    it('должен пробрасывать ошибки от операции', async () => {
      const params: GetQueueDto = { queueId: 'INVALID' };
      const error = new Error('Queue not found');
      vi.mocked(mockGetQueueOp.execute).mockRejectedValue(error);

      await expect(service.getQueue(params)).rejects.toThrow('Queue not found');
    });
  });

  describe('createQueue', () => {
    it('должен делегировать вызов CreateQueueOperation', async () => {
      const queueData: CreateQueueDto = {
        key: 'NEW',
        name: 'New Queue',
        lead: 'lead-user',
        defaultType: 'task',
        defaultPriority: 'normal',
        issueTypesConfig: [{ issueType: 'task' }],
      };
      const mockResult: QueueOutput = createQueueFixture({ key: 'NEW', name: 'New Queue' });

      vi.mocked(mockCreateQueueOp.execute).mockResolvedValue(mockResult);

      const result = await service.createQueue(queueData);

      expect(mockCreateQueueOp.execute).toHaveBeenCalledWith(queueData);
      expect(result).toBe(mockResult);
    });
  });

  describe('updateQueue', () => {
    it('должен делегировать вызов UpdateQueueOperation', async () => {
      const params: UpdateQueueParams = {
        queueId: 'TEST',
        updates: { name: 'Updated Queue' },
      };
      const mockResult: QueueOutput = createQueueFixture({ name: 'Updated Queue' });

      vi.mocked(mockUpdateQueueOp.execute).mockResolvedValue(mockResult);

      const result = await service.updateQueue(params);

      expect(mockUpdateQueueOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });

  describe('getQueueFields', () => {
    it('должен делегировать вызов GetQueueFieldsOperation', async () => {
      const params: GetQueueFieldsDto = { queueId: 'TEST' };
      const mockResult: QueueFieldsOutput = [createQueueFieldFixture()];

      vi.mocked(mockGetQueueFieldsOp.execute).mockResolvedValue(mockResult);

      const result = await service.getQueueFields(params);

      expect(mockGetQueueFieldsOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен возвращать пустой массив если полей нет', async () => {
      const params: GetQueueFieldsDto = { queueId: 'TEST' };
      vi.mocked(mockGetQueueFieldsOp.execute).mockResolvedValue([]);

      const result = await service.getQueueFields(params);

      expect(result).toEqual([]);
    });
  });

  describe('manageQueueAccess', () => {
    it('должен делегировать вызов ManageQueueAccessOperation', async () => {
      const params: ManageQueueAccessParams = {
        queueId: 'TEST',
        accessData: {
          create: { users: ['user1'], groups: [] },
        },
      };
      const mockResult: QueuePermissionsOutput = [
        {
          self: 'https://api.tracker.yandex.net/v3/queues/TEST/permissions/create',
          type: 'create',
          users: [{ uid: 'user1', display: 'User 1', login: 'user1', isActive: true }],
          groups: [],
        },
      ];

      vi.mocked(mockManageQueueAccessOp.execute).mockResolvedValue(mockResult);

      const result = await service.manageQueueAccess(params);

      expect(mockManageQueueAccessOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });
});
