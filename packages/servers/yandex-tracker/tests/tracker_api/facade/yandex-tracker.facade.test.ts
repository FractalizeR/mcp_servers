import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Container } from 'inversify';
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { PingResult } from '@tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesResult } from '@tracker_api/api_operations/issue/find/index.js';
import type { User } from '@tracker_api/entities/user.entity.js';
import type { Issue, IssueWithUnknownFields } from '@tracker_api/entities/issue.entity.js';
import type { Queue } from '@tracker_api/entities/queue.entity.js';
import type { Status } from '@tracker_api/entities/status.entity.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
} from '@tracker_api/dto/index.js';
import type {
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields,
} from '@tracker_api/entities/index.js';

describe('YandexTrackerFacade', () => {
  let facade: YandexTrackerFacade;
  let mockContainer: Container;
  let mockPingOperation: { execute: () => Promise<PingResult> };
  let mockGetIssuesOperation: { execute: (keys: string[]) => Promise<BatchIssueResult[]> };
  let mockFindIssuesOperation: {
    execute: (params: FindIssuesInputDto) => Promise<FindIssuesResult>;
  };
  let mockCreateIssueOperation: {
    execute: (data: CreateIssueDto) => Promise<IssueWithUnknownFields>;
  };
  let mockUpdateIssueOperation: {
    execute: (key: string, data: UpdateIssueDto) => Promise<IssueWithUnknownFields>;
  };
  let mockGetIssueChangelogOperation: {
    execute: (key: string) => Promise<ChangelogEntryWithUnknownFields[]>;
  };
  let mockGetIssueTransitionsOperation: {
    execute: (key: string) => Promise<TransitionWithUnknownFields[]>;
  };
  let mockTransitionIssueOperation: {
    execute: (
      key: string,
      id: string,
      data?: ExecuteTransitionDto
    ) => Promise<IssueWithUnknownFields>;
  };

  beforeEach(() => {
    // Mock PingOperation
    mockPingOperation = {
      execute: vi.fn(),
    };

    // Mock GetIssuesOperation
    mockGetIssuesOperation = {
      execute: vi.fn(),
    };

    // Mock FindIssuesOperation
    mockFindIssuesOperation = {
      execute: vi.fn(),
    };

    // Mock CreateIssueOperation
    mockCreateIssueOperation = {
      execute: vi.fn(),
    };

    // Mock UpdateIssueOperation
    mockUpdateIssueOperation = {
      execute: vi.fn(),
    };

    // Mock GetIssueChangelogOperation
    mockGetIssueChangelogOperation = {
      execute: vi.fn(),
    };

    // Mock GetIssueTransitionsOperation
    mockGetIssueTransitionsOperation = {
      execute: vi.fn(),
    };

    // Mock TransitionIssueOperation
    mockTransitionIssueOperation = {
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
        if (symbol === Symbol.for('FindIssuesOperation')) {
          return mockFindIssuesOperation;
        }
        if (symbol === Symbol.for('CreateIssueOperation')) {
          return mockCreateIssueOperation;
        }
        if (symbol === Symbol.for('UpdateIssueOperation')) {
          return mockUpdateIssueOperation;
        }
        if (symbol === Symbol.for('GetIssueChangelogOperation')) {
          return mockGetIssueChangelogOperation;
        }
        if (symbol === Symbol.for('GetIssueTransitionsOperation')) {
          return mockGetIssueTransitionsOperation;
        }
        if (symbol === Symbol.for('TransitionIssueOperation')) {
          return mockTransitionIssueOperation;
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

  describe('findIssues', () => {
    it('должна вызвать FindIssuesOperation.execute с правильными params', async () => {
      const params: FindIssuesInputDto = { query: 'status: open', perPage: 50 };
      const mockResult: FindIssuesResult = [
        {
          id: '1',
          key: 'TEST-1',
          summary: 'Test',
          queue: { id: '1', key: 'TEST', name: 'Test' },
          status: { id: '1', key: 'open', display: 'Open' },
          createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      vi.mocked(mockFindIssuesOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.findIssues(params);

      expect(mockFindIssuesOperation.execute).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от FindIssuesOperation', async () => {
      const params: FindIssuesInputDto = { query: 'invalid' };
      const error = new Error('Find failed');
      vi.mocked(mockFindIssuesOperation.execute).mockRejectedValue(error);

      await expect(facade.findIssues(params)).rejects.toThrow('Find failed');
    });
  });

  describe('createIssue', () => {
    it('должна вызвать CreateIssueOperation.execute с правильными данными', async () => {
      const issueData: CreateIssueDto = { queue: 'TEST', summary: 'New Issue' };
      const mockResult: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-1',
        summary: 'New Issue',
        queue: { id: '1', key: 'TEST', name: 'Test' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      vi.mocked(mockCreateIssueOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.createIssue(issueData);

      expect(mockCreateIssueOperation.execute).toHaveBeenCalledWith(issueData);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от CreateIssueOperation', async () => {
      const issueData: CreateIssueDto = { queue: 'TEST', summary: '' };
      const error = new Error('Create failed');
      vi.mocked(mockCreateIssueOperation.execute).mockRejectedValue(error);

      await expect(facade.createIssue(issueData)).rejects.toThrow('Create failed');
    });
  });

  describe('updateIssue', () => {
    it('должна вызвать UpdateIssueOperation.execute с правильными параметрами', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = { summary: 'Updated' };
      const mockResult: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Updated',
        queue: { id: '1', key: 'TEST', name: 'Test' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      vi.mocked(mockUpdateIssueOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.updateIssue(issueKey, updateData);

      expect(mockUpdateIssueOperation.execute).toHaveBeenCalledWith(issueKey, updateData);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от UpdateIssueOperation', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = { summary: '' };
      const error = new Error('Update failed');
      vi.mocked(mockUpdateIssueOperation.execute).mockRejectedValue(error);

      await expect(facade.updateIssue(issueKey, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('getIssueChangelog', () => {
    it('должна вызвать GetIssueChangelogOperation.execute с правильным ключом', async () => {
      const issueKey = 'TEST-123';
      const mockResult: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/changelog/1',
          issue: { id: '123', key: 'TEST-123', display: 'Test Issue' },
          updatedAt: '2024-01-01',
          updatedBy: { uid: '1', display: 'User', login: 'user', isActive: true },
          type: 'IssueUpdated',
          fields: [],
        },
      ];

      vi.mocked(mockGetIssueChangelogOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.getIssueChangelog(issueKey);

      expect(mockGetIssueChangelogOperation.execute).toHaveBeenCalledWith(issueKey);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от GetIssueChangelogOperation', async () => {
      const issueKey = 'TEST-123';
      const error = new Error('Changelog failed');
      vi.mocked(mockGetIssueChangelogOperation.execute).mockRejectedValue(error);

      await expect(facade.getIssueChangelog(issueKey)).rejects.toThrow('Changelog failed');
    });
  });

  describe('getIssueTransitions', () => {
    it('должна вызвать GetIssueTransitionsOperation.execute с правильным ключом', async () => {
      const issueKey = 'TEST-123';
      const mockResult: TransitionWithUnknownFields[] = [
        {
          id: 'trans1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/transitions/trans1',
          to: { id: '2', key: 'inProgress', display: 'In Progress' },
        },
      ];

      vi.mocked(mockGetIssueTransitionsOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.getIssueTransitions(issueKey);

      expect(mockGetIssueTransitionsOperation.execute).toHaveBeenCalledWith(issueKey);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от GetIssueTransitionsOperation', async () => {
      const issueKey = 'TEST-123';
      const error = new Error('Transitions failed');
      vi.mocked(mockGetIssueTransitionsOperation.execute).mockRejectedValue(error);

      await expect(facade.getIssueTransitions(issueKey)).rejects.toThrow('Transitions failed');
    });
  });

  describe('transitionIssue', () => {
    it('должна вызвать TransitionIssueOperation.execute с правильными параметрами', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'trans1';
      const transitionData: ExecuteTransitionDto = { comment: 'Moving' };
      const mockResult: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test',
        queue: { id: '1', key: 'TEST', name: 'Test' },
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      vi.mocked(mockTransitionIssueOperation.execute).mockResolvedValue(mockResult);

      const result = await facade.transitionIssue(issueKey, transitionId, transitionData);

      expect(mockTransitionIssueOperation.execute).toHaveBeenCalledWith(
        issueKey,
        transitionId,
        transitionData
      );
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от TransitionIssueOperation', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'trans1';
      const error = new Error('Transition failed');
      vi.mocked(mockTransitionIssueOperation.execute).mockRejectedValue(error);

      await expect(facade.transitionIssue(issueKey, transitionId)).rejects.toThrow(
        'Transition failed'
      );
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
