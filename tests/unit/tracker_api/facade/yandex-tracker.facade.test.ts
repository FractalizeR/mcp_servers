import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Container } from 'inversify';
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { PingResult } from '@tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/api_operations/issue/get-issues.operation.js';
import type { User } from '@tracker_api/entities/user.entity.js';
import type { Issue, IssueWithUnknownFields } from '@tracker_api/entities/issue.entity.js';
import type { Queue } from '@tracker_api/entities/queue.entity.js';
import type { Status } from '@tracker_api/entities/status.entity.js';

describe('YandexTrackerFacade', () => {
  let facade: YandexTrackerFacade;
  let mockContainer: Container;
  let mockPingOperation: { execute: () => Promise<PingResult> };
  let mockGetIssuesOperation: { execute: (keys: string[]) => Promise<BatchIssueResult[]> };

  beforeEach(() => {
    // Mock PingOperation
    mockPingOperation = {
      execute: vi.fn(),
    };

    // Mock GetIssuesOperation
    mockGetIssuesOperation = {
      execute: vi.fn(),
    };

    // Mock InversifyJS Container
    mockContainer = {
      get: vi.fn((symbol: symbol) => {
        if (symbol === Symbol.for('PingOperation')) {
          return mockPingOperation;
        }
        if (symbol === Symbol.for('GetIssuesOperation')) {
          return mockGetIssuesOperation;
        }
        throw new Error(`Unknown symbol: ${symbol.toString()}`);
      }),
    } as unknown as Container;

    facade = new YandexTrackerFacade(mockContainer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ping', () => {
    it('должна успешно вызвать операцию ping', async () => {
      // Arrange
      const pingResult: PingResult = {
        success: true,
        message: `Успешно подключено к API Яндекс.Трекера. Текущий пользователь: Test User (testuser)`,
      };

      vi.mocked(mockPingOperation.execute).mockResolvedValue(pingResult);

      // Act
      const result: PingResult = await facade.ping();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test User');
      expect(mockPingOperation.execute).toHaveBeenCalledOnce();
      expect(mockContainer.get).toHaveBeenCalledWith(Symbol.for('PingOperation'));
    });

    it('должна делегировать обработку ошибок операции ping', async () => {
      // Arrange
      const pingResult: PingResult = {
        success: false,
        message: 'Ошибка подключения к API Яндекс.Трекера',
      };

      vi.mocked(mockPingOperation.execute).mockResolvedValue(pingResult);

      // Act
      const result: PingResult = await facade.ping();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка подключения');
      expect(mockPingOperation.execute).toHaveBeenCalledOnce();
    });
  });

  describe('getIssues', () => {
    it('должна успешно получить несколько задач', async () => {
      // Arrange
      const issueKeys = ['TEST-1', 'TEST-2'];

      const mockQueue: Queue = {
        id: '1',
        key: 'TEST',
        name: 'Test Queue',
      };

      const mockStatus: Status = {
        id: '1',
        key: 'open',
        display: 'Open',
      };

      const mockUser: User = {
        uid: '123',
        display: 'Test User',
        login: 'testuser',
        isActive: true,
      };

      const mockIssue1: Issue = {
        id: '1',
        key: 'TEST-1',
        summary: 'Test Issue 1',
        queue: mockQueue,
        status: mockStatus,
        createdBy: mockUser,
        createdAt: '2023-01-01T00:00:00.000+0000',
        updatedAt: '2023-01-01T00:00:00.000+0000',
      };

      const mockIssue2: Issue = {
        id: '2',
        key: 'TEST-2',
        summary: 'Test Issue 2',
        queue: mockQueue,
        status: mockStatus,
        createdBy: mockUser,
        createdAt: '2023-01-02T00:00:00.000+0000',
        updatedAt: '2023-01-02T00:00:00.000+0000',
      };

      const batchResults: BatchIssueResult[] = [
        {
          status: 'fulfilled',
          value: mockIssue1 as IssueWithUnknownFields,
          key: 'ISSUE-1',
          index: 0,
        },
        {
          status: 'fulfilled',
          value: mockIssue2 as IssueWithUnknownFields,
          key: 'ISSUE-2',
          index: 1,
        },
      ];

      vi.mocked(mockGetIssuesOperation.execute).mockResolvedValue(batchResults);

      // Act
      const results: BatchIssueResult[] = await facade.getIssues(issueKeys);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('fulfilled');
      expect(results[1]!.status).toBe('fulfilled');

      if (results[0]!.status === 'fulfilled') {
        expect(results[0]!.value.key).toBe('TEST-1');
      }
      if (results[1]!.status === 'fulfilled') {
        expect(results[1]!.value.key).toBe('TEST-2');
      }

      expect(mockGetIssuesOperation.execute).toHaveBeenCalledWith(issueKeys);
      expect(mockContainer.get).toHaveBeenCalledWith(Symbol.for('GetIssuesOperation'));
    });

    it('должна обработать частичные ошибки при получении задач', async () => {
      // Arrange
      const issueKeys = ['TEST-1', 'INVALID'];

      const mockQueue: Queue = {
        id: '1',
        key: 'TEST',
        name: 'Test Queue',
      };

      const mockStatus: Status = {
        id: '1',
        key: 'open',
        display: 'Open',
      };

      const mockUser: User = {
        uid: '123',
        display: 'Test User',
        login: 'testuser',
        isActive: true,
      };

      const mockIssue: Issue = {
        id: '1',
        key: 'TEST-1',
        summary: 'Test Issue',
        queue: mockQueue,
        status: mockStatus,
        createdBy: mockUser,
        createdAt: '2023-01-01T00:00:00.000+0000',
        updatedAt: '2023-01-01T00:00:00.000+0000',
      };

      const apiError = new Error('Not Found');

      const batchResults: BatchIssueResult[] = [
        {
          status: 'fulfilled',
          value: mockIssue as IssueWithUnknownFields,
          key: 'ISSUE-1',
          index: 0,
        },
        { status: 'rejected', reason: apiError, key: 'ISSUE-2', index: 1 },
      ];

      vi.mocked(mockGetIssuesOperation.execute).mockResolvedValue(batchResults);

      // Act
      const results: BatchIssueResult[] = await facade.getIssues(issueKeys);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('fulfilled');
      expect(results[1]!.status).toBe('rejected');

      if (results[0]!.status === 'fulfilled') {
        expect(results[0]!.value.key).toBe('TEST-1');
      }
      if (results[1]!.status === 'rejected') {
        expect(results[1]!.reason).toBeInstanceOf(Error);
        expect(results[1]!.reason.message).toBe('Not Found');
      }
    });

    it('должна вернуть пустой массив для пустого списка ключей', async () => {
      // Arrange
      const issueKeys: string[] = [];
      const batchResults: BatchIssueResult[] = [];

      vi.mocked(mockGetIssuesOperation.execute).mockResolvedValue(batchResults);

      // Act
      const results: BatchIssueResult[] = await facade.getIssues(issueKeys);

      // Assert
      expect(results).toHaveLength(0);
      expect(mockGetIssuesOperation.execute).toHaveBeenCalledWith(issueKeys);
    });
  });

  describe('constructor', () => {
    it('должна правильно инициализировать фасад с контейнером', () => {
      // Act - создание нового экземпляра
      const newFacade = new YandexTrackerFacade(mockContainer);

      // Assert - проверяем, что можем вызвать методы
      expect(newFacade.ping).toBeDefined();
      expect(newFacade.getIssues).toBeDefined();
      expect(typeof newFacade.ping).toBe('function');
      expect(typeof newFacade.getIssues).toBe('function');
    });
  });
});
