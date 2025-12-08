/**
 * Unit tests for QueueService
 *
 * Проверяет:
 * - Конструктор с 1 параметром (QueueOperationsContainer)
 * - Делегирование вызовов соответствующим операциям через контейнер
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueService } from '#tracker_api/facade/services/queue.service.js';
import type { QueueOperationsContainer } from '#tracker_api/facade/services/containers/index.js';
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
  let mockOpsContainer: QueueOperationsContainer;

  beforeEach(() => {
    // Create mock operations container with all operations
    mockOpsContainer = {
      getQueues: { execute: vi.fn() },
      getQueue: { execute: vi.fn() },
      createQueue: { execute: vi.fn() },
      updateQueue: { execute: vi.fn() },
      getQueueFields: { execute: vi.fn() },
      manageQueueAccess: { execute: vi.fn() },
    } as unknown as QueueOperationsContainer;

    service = new QueueService(mockOpsContainer);
  });

  describe('constructor', () => {
    it('должен создать сервис с 1 параметром (QueueOperationsContainer)', () => {
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
    it('должен делегировать вызов ops.getQueues.execute без параметров', async () => {
      const mockResult: QueuesListOutput = [createQueueFixture()];

      vi.mocked(mockOpsContainer.getQueues.execute).mockResolvedValue(mockResult);

      const result = await service.getQueues();

      expect(mockOpsContainer.getQueues.execute).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockResult);
    });

    it('должен делегировать вызов ops.getQueues.execute с параметрами', async () => {
      const params: GetQueuesDto = { perPage: 50, page: 2 };
      const mockResult: QueuesListOutput = [createQueueFixture()];

      vi.mocked(mockOpsContainer.getQueues.execute).mockResolvedValue(mockResult);

      const result = await service.getQueues(params);

      expect(mockOpsContainer.getQueues.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен возвращать пустой массив если очередей нет', async () => {
      vi.mocked(mockOpsContainer.getQueues.execute).mockResolvedValue([]);

      const result = await service.getQueues();

      expect(result).toEqual([]);
    });
  });

  describe('getQueue', () => {
    it('должен делегировать вызов ops.getQueue.execute', async () => {
      const params: GetQueueDto = { queueId: 'TEST' };
      const mockResult: QueueOutput = createQueueFixture();

      vi.mocked(mockOpsContainer.getQueue.execute).mockResolvedValue(mockResult);

      const result = await service.getQueue(params);

      expect(mockOpsContainer.getQueue.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен поддерживать expand параметр', async () => {
      const params: GetQueueDto = { queueId: 'TEST', expand: 'projects' };
      const mockResult: QueueOutput = createQueueFixture();

      vi.mocked(mockOpsContainer.getQueue.execute).mockResolvedValue(mockResult);

      await service.getQueue(params);

      expect(mockOpsContainer.getQueue.execute).toHaveBeenCalledWith(params);
    });

    it('должен пробрасывать ошибки от операции', async () => {
      const params: GetQueueDto = { queueId: 'INVALID' };
      const error = new Error('Queue not found');
      vi.mocked(mockOpsContainer.getQueue.execute).mockRejectedValue(error);

      await expect(service.getQueue(params)).rejects.toThrow('Queue not found');
    });
  });

  describe('createQueue', () => {
    it('должен делегировать вызов ops.createQueue.execute', async () => {
      const queueData: CreateQueueDto = {
        key: 'NEW',
        name: 'New Queue',
        lead: 'lead-user',
        defaultType: 'task',
        defaultPriority: 'normal',
        issueTypesConfig: [{ issueType: 'task' }],
      };
      const mockResult: QueueOutput = createQueueFixture({ key: 'NEW', name: 'New Queue' });

      vi.mocked(mockOpsContainer.createQueue.execute).mockResolvedValue(mockResult);

      const result = await service.createQueue(queueData);

      expect(mockOpsContainer.createQueue.execute).toHaveBeenCalledWith(queueData);
      expect(result).toBe(mockResult);
    });
  });

  describe('updateQueue', () => {
    it('должен делегировать вызов ops.updateQueue.execute', async () => {
      const params: UpdateQueueParams = {
        queueId: 'TEST',
        updates: { name: 'Updated Queue' },
      };
      const mockResult: QueueOutput = createQueueFixture({ name: 'Updated Queue' });

      vi.mocked(mockOpsContainer.updateQueue.execute).mockResolvedValue(mockResult);

      const result = await service.updateQueue(params);

      expect(mockOpsContainer.updateQueue.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });

  describe('getQueueFields', () => {
    it('должен делегировать вызов ops.getQueueFields.execute', async () => {
      const params: GetQueueFieldsDto = { queueId: 'TEST' };
      const mockResult: QueueFieldsOutput = [createQueueFieldFixture()];

      vi.mocked(mockOpsContainer.getQueueFields.execute).mockResolvedValue(mockResult);

      const result = await service.getQueueFields(params);

      expect(mockOpsContainer.getQueueFields.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен возвращать пустой массив если полей нет', async () => {
      const params: GetQueueFieldsDto = { queueId: 'TEST' };
      vi.mocked(mockOpsContainer.getQueueFields.execute).mockResolvedValue([]);

      const result = await service.getQueueFields(params);

      expect(result).toEqual([]);
    });
  });

  describe('manageQueueAccess', () => {
    it('должен делегировать вызов ops.manageQueueAccess.execute', async () => {
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

      vi.mocked(mockOpsContainer.manageQueueAccess.execute).mockResolvedValue(mockResult);

      const result = await service.manageQueueAccess(params);

      expect(mockOpsContainer.manageQueueAccess.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });
});
