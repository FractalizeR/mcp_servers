import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type {
  CoreServicesContainer,
  IssueServicesContainer,
  QueueServicesContainer,
  ProjectAgileServicesContainer,
} from '#tracker_api/facade/services/containers/index.js';
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesResult } from '#tracker_api/api_operations/issue/find/index.js';
import type { User } from '#tracker_api/entities/user.entity.js';
import type { Issue, IssueWithUnknownFields } from '#tracker_api/entities/issue.entity.js';
import type { Queue } from '#tracker_api/entities/queue.entity.js';
import type { Status } from '#tracker_api/entities/status.entity.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
  AddWorklogInput,
  UpdateWorklogInput,
  CreateFieldDto,
  UpdateFieldDto,
  FieldOutput,
  FieldsListOutput,
  GetBoardsDto,
  CreateBoardDto,
  BoardOutput,
  BoardsListOutput,
  CreateSprintDto,
  SprintOutput,
  SprintsListOutput,
} from '#tracker_api/dto/index.js';
import type {
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields,
  WorklogWithUnknownFields,
} from '#tracker_api/entities/index.js';

describe('YandexTrackerFacade', () => {
  let facade: YandexTrackerFacade;

  // Mock Containers
  let mockCoreContainer: CoreServicesContainer;
  let mockIssuesContainer: IssueServicesContainer;
  let mockQueuesContainer: QueueServicesContainer;
  let mockProjectAgileContainer: ProjectAgileServicesContainer;

  beforeEach(() => {
    // Create mock containers with services
    mockCoreContainer = {
      user: {
        ping: vi.fn(),
      },
      field: {
        getFields: vi.fn(),
        getField: vi.fn(),
        createField: vi.fn(),
        updateField: vi.fn(),
        deleteField: vi.fn(),
      },
    } as unknown as CoreServicesContainer;

    mockIssuesContainer = {
      issue: {
        getIssues: vi.fn(),
        findIssues: vi.fn(),
        createIssue: vi.fn(),
        updateIssue: vi.fn(),
        getIssueChangelog: vi.fn(),
        getIssueTransitions: vi.fn(),
        transitionIssue: vi.fn(),
      },
      link: {
        getIssueLinks: vi.fn(),
        createLink: vi.fn(),
        deleteLink: vi.fn(),
      },
      attachment: {
        getAttachments: vi.fn(),
        uploadAttachment: vi.fn(),
        downloadAttachment: vi.fn(),
        deleteAttachment: vi.fn(),
        getThumbnail: vi.fn(),
      },
      comment: {
        addComment: vi.fn(),
        getComments: vi.fn(),
        editComment: vi.fn(),
        deleteComment: vi.fn(),
      },
      checklist: {
        getChecklist: vi.fn(),
        getChecklistMany: vi.fn(),
        addChecklistItem: vi.fn(),
        addChecklistItemMany: vi.fn(),
        updateChecklistItem: vi.fn(),
        deleteChecklistItem: vi.fn(),
        deleteChecklistItemMany: vi.fn(),
      },
      worklog: {
        getWorklogs: vi.fn(),
        addWorklog: vi.fn(),
        updateWorklog: vi.fn(),
        deleteWorklog: vi.fn(),
      },
    } as unknown as IssueServicesContainer;

    mockQueuesContainer = {
      queue: {
        getQueues: vi.fn(),
        getQueue: vi.fn(),
        createQueue: vi.fn(),
        updateQueue: vi.fn(),
        getQueueFields: vi.fn(),
        manageQueueAccess: vi.fn(),
      },
      component: {
        getComponents: vi.fn(),
        createComponent: vi.fn(),
        updateComponent: vi.fn(),
        deleteComponent: vi.fn(),
      },
    } as unknown as QueueServicesContainer;

    mockProjectAgileContainer = {
      project: {
        getProjects: vi.fn(),
        getProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
      },
      board: {
        getBoards: vi.fn(),
        getBoard: vi.fn(),
        createBoard: vi.fn(),
        updateBoard: vi.fn(),
        deleteBoard: vi.fn(),
      },
      sprint: {
        getSprints: vi.fn(),
        getSprint: vi.fn(),
        createSprint: vi.fn(),
        updateSprint: vi.fn(),
      },
      bulkChange: {
        bulkUpdateIssues: vi.fn(),
        bulkTransitionIssues: vi.fn(),
        bulkMoveIssues: vi.fn(),
        getBulkChangeStatus: vi.fn(),
      },
    } as unknown as ProjectAgileServicesContainer;

    // Create facade with mocked containers
    facade = new YandexTrackerFacade(
      mockCoreContainer,
      mockIssuesContainer,
      mockQueuesContainer,
      mockProjectAgileContainer
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ping', () => {
    it('должна успешно вызвать UserService.ping', async () => {
      // Arrange
      const pingResult: PingResult = {
        success: true,
        message: `Успешно подключено к API Яндекс.Трекера. Текущий пользователь: Test User (testuser)`,
      };

      vi.mocked(mockCoreContainer.user.ping).mockResolvedValue(pingResult);

      // Act
      const result: PingResult = await facade.ping();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test User');
      expect(mockCoreContainer.user.ping).toHaveBeenCalledOnce();
    });

    it('должна делегировать обработку ошибок UserService.ping', async () => {
      // Arrange
      const pingResult: PingResult = {
        success: false,
        message: 'Ошибка подключения к API Яндекс.Трекера',
      };

      vi.mocked(mockCoreContainer.user.ping).mockResolvedValue(pingResult);

      // Act
      const result: PingResult = await facade.ping();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка подключения');
      expect(mockCoreContainer.user.ping).toHaveBeenCalledOnce();
    });
  });

  describe('getIssues', () => {
    it('должна успешно делегировать вызов IssueService.getIssues', async () => {
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
          key: 'TEST-1',
          index: 0,
        },
        {
          status: 'fulfilled',
          value: mockIssue2 as IssueWithUnknownFields,
          key: 'TEST-2',
          index: 1,
        },
      ];

      vi.mocked(mockIssuesContainer.issue.getIssues).mockResolvedValue(batchResults);

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

      expect(mockIssuesContainer.issue.getIssues).toHaveBeenCalledWith(issueKeys);
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
          key: 'TEST-1',
          index: 0,
        },
        { status: 'rejected', reason: apiError, key: 'INVALID', index: 1 },
      ];

      vi.mocked(mockIssuesContainer.issue.getIssues).mockResolvedValue(batchResults);

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

      expect(mockIssuesContainer.issue.getIssues).toHaveBeenCalledWith(issueKeys);
    });
  });

  describe('findIssues', () => {
    it('должна делегировать вызов IssueService.findIssues', async () => {
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

      vi.mocked(mockIssuesContainer.issue.findIssues).mockResolvedValue(mockResult);

      const result = await facade.findIssues(params);

      expect(mockIssuesContainer.issue.findIssues).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.findIssues', async () => {
      const params: FindIssuesInputDto = { query: 'invalid' };
      const error = new Error('Find failed');
      vi.mocked(mockIssuesContainer.issue.findIssues).mockRejectedValue(error);

      await expect(facade.findIssues(params)).rejects.toThrow('Find failed');
    });
  });

  describe('createIssue', () => {
    it('должна делегировать вызов IssueService.createIssue', async () => {
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

      vi.mocked(mockIssuesContainer.issue.createIssue).mockResolvedValue(mockResult);

      const result = await facade.createIssue(issueData);

      expect(mockIssuesContainer.issue.createIssue).toHaveBeenCalledWith(issueData);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.createIssue', async () => {
      const issueData: CreateIssueDto = { queue: 'TEST', summary: '' };
      const error = new Error('Create failed');
      vi.mocked(mockIssuesContainer.issue.createIssue).mockRejectedValue(error);

      await expect(facade.createIssue(issueData)).rejects.toThrow('Create failed');
    });
  });

  describe('updateIssue', () => {
    it('должна делегировать вызов IssueService.updateIssue', async () => {
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

      vi.mocked(mockIssuesContainer.issue.updateIssue).mockResolvedValue(mockResult);

      const result = await facade.updateIssue(issueKey, updateData);

      expect(mockIssuesContainer.issue.updateIssue).toHaveBeenCalledWith(issueKey, updateData);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.updateIssue', async () => {
      const issueKey = 'TEST-123';
      const updateData: UpdateIssueDto = { summary: '' };
      const error = new Error('Update failed');
      vi.mocked(mockIssuesContainer.issue.updateIssue).mockRejectedValue(error);

      await expect(facade.updateIssue(issueKey, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('getIssueChangelog', () => {
    it('должна делегировать вызов IssueService.getIssueChangelog', async () => {
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

      vi.mocked(mockIssuesContainer.issue.getIssueChangelog).mockResolvedValue(mockResult);

      const result = await facade.getIssueChangelog(issueKey);

      expect(mockIssuesContainer.issue.getIssueChangelog).toHaveBeenCalledWith(issueKey);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.getIssueChangelog', async () => {
      const issueKey = 'TEST-123';
      const error = new Error('Changelog failed');
      vi.mocked(mockIssuesContainer.issue.getIssueChangelog).mockRejectedValue(error);

      await expect(facade.getIssueChangelog(issueKey)).rejects.toThrow('Changelog failed');
    });
  });

  describe('getIssueTransitions', () => {
    it('должна делегировать вызов IssueService.getIssueTransitions', async () => {
      const issueKey = 'TEST-123';
      const mockResult: TransitionWithUnknownFields[] = [
        {
          id: 'trans1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/transitions/trans1',
          to: { id: '2', key: 'inProgress', display: 'In Progress' },
        },
      ];

      vi.mocked(mockIssuesContainer.issue.getIssueTransitions).mockResolvedValue(mockResult);

      const result = await facade.getIssueTransitions(issueKey);

      expect(mockIssuesContainer.issue.getIssueTransitions).toHaveBeenCalledWith(issueKey);
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.getIssueTransitions', async () => {
      const issueKey = 'TEST-123';
      const error = new Error('Transitions failed');
      vi.mocked(mockIssuesContainer.issue.getIssueTransitions).mockRejectedValue(error);

      await expect(facade.getIssueTransitions(issueKey)).rejects.toThrow('Transitions failed');
    });
  });

  describe('transitionIssue', () => {
    it('должна делегировать вызов IssueService.transitionIssue', async () => {
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

      vi.mocked(mockIssuesContainer.issue.transitionIssue).mockResolvedValue(mockResult);

      const result = await facade.transitionIssue(issueKey, transitionId, transitionData);

      expect(mockIssuesContainer.issue.transitionIssue).toHaveBeenCalledWith(
        issueKey,
        transitionId,
        transitionData
      );
      expect(result).toEqual(mockResult);
    });

    it('должна обрабатывать ошибки от IssueService.transitionIssue', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'trans1';
      const error = new Error('Transition failed');
      vi.mocked(mockIssuesContainer.issue.transitionIssue).mockRejectedValue(error);

      await expect(facade.transitionIssue(issueKey, transitionId)).rejects.toThrow(
        'Transition failed'
      );
    });
  });

  describe('constructor', () => {
    it('должна правильно инициализировать фасад с контейнерами', () => {
      // Act - создание нового экземпляра
      const newFacade = new YandexTrackerFacade(
        mockCoreContainer,
        mockIssuesContainer,
        mockQueuesContainer,
        mockProjectAgileContainer
      );

      // Assert - проверяем, что можем вызвать методы
      expect(newFacade.ping).toBeDefined();
      expect(newFacade.getIssues).toBeDefined();
      expect(typeof newFacade.ping).toBe('function');
      expect(typeof newFacade.getIssues).toBe('function');
    });
  });

  describe('Worklog methods', () => {
    describe('getWorklogs', () => {
      it('должна делегировать вызов WorklogService.getWorklogs', async () => {
        const issueId = 'TEST-1';
        const mockResult: WorklogWithUnknownFields[] = [
          {
            id: '1',
            self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/1',
            issue: { id: '1', key: 'TEST-1', display: 'Test Issue' },
            createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
            createdAt: '2024-01-01',
            duration: 'PT1H',
          },
        ];

        vi.mocked(mockIssuesContainer.worklog.getWorklogs).mockResolvedValue(mockResult);

        const result = await facade.getWorklogs(issueId);

        expect(mockIssuesContainer.worklog.getWorklogs).toHaveBeenCalledWith(issueId);
        expect(result).toEqual(mockResult);
      });
    });

    describe('addWorklog', () => {
      it('должна делегировать вызов WorklogService.addWorklog', async () => {
        const issueId = 'TEST-1';
        const input: AddWorklogInput = { duration: 'PT1H', comment: 'Work done' };
        const mockResult: WorklogWithUnknownFields = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/1',
          issue: { id: '1', key: 'TEST-1', display: 'Test Issue' },
          createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
          createdAt: '2024-01-01',
          duration: 'PT1H',
        };

        vi.mocked(mockIssuesContainer.worklog.addWorklog).mockResolvedValue(mockResult);

        const result = await facade.addWorklog(issueId, input);

        expect(mockIssuesContainer.worklog.addWorklog).toHaveBeenCalledWith(issueId, input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('updateWorklog', () => {
      it('должна делегировать вызов WorklogService.updateWorklog', async () => {
        const issueId = 'TEST-1';
        const worklogId = '123';
        const input: UpdateWorklogInput = { duration: 'PT2H' };
        const mockResult: WorklogWithUnknownFields = {
          id: '123',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/123',
          issue: { id: '1', key: 'TEST-1', display: 'Test Issue' },
          createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
          createdAt: '2024-01-01',
          duration: 'PT2H',
        };

        vi.mocked(mockIssuesContainer.worklog.updateWorklog).mockResolvedValue(mockResult);

        const result = await facade.updateWorklog(issueId, worklogId, input);

        expect(mockIssuesContainer.worklog.updateWorklog).toHaveBeenCalledWith(
          issueId,
          worklogId,
          input
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteWorklog', () => {
      it('должна делегировать вызов WorklogService.deleteWorklog', async () => {
        const issueId = 'TEST-1';
        const worklogId = '123';

        vi.mocked(mockIssuesContainer.worklog.deleteWorklog).mockResolvedValue(undefined);

        await facade.deleteWorklog(issueId, worklogId);

        expect(mockIssuesContainer.worklog.deleteWorklog).toHaveBeenCalledWith(issueId, worklogId);
      });
    });
  });

  describe('Field methods', () => {
    describe('getFields', () => {
      it('должна делегировать вызов FieldService.getFields', async () => {
        const mockResult: FieldsListOutput = [
          {
            id: 'field1',
            self: 'https://api.tracker.yandex.net/v3/fields/field1',
            key: 'field1',
            name: 'Field 1',
          },
        ];

        vi.mocked(mockCoreContainer.field.getFields).mockResolvedValue(mockResult);

        const result = await facade.getFields();

        expect(mockCoreContainer.field.getFields).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });
    });

    describe('getField', () => {
      it('должна делегировать вызов FieldService.getField', async () => {
        const fieldId = 'customField123';
        const mockResult: FieldOutput = {
          id: 'customField123',
          self: 'https://api.tracker.yandex.net/v3/fields/customField123',
          key: 'customField123',
          name: 'Custom Field',
        };

        vi.mocked(mockCoreContainer.field.getField).mockResolvedValue(mockResult);

        const result = await facade.getField(fieldId);

        expect(mockCoreContainer.field.getField).toHaveBeenCalledWith(fieldId);
        expect(result).toEqual(mockResult);
      });
    });

    describe('createField', () => {
      it('должна делегировать вызов FieldService.createField', async () => {
        const input: CreateFieldDto = { name: 'Custom Field', type: 'string' };
        const mockResult: FieldOutput = {
          id: 'newField',
          self: 'https://api.tracker.yandex.net/v3/fields/newField',
          key: 'newField',
          name: 'Custom Field',
        };

        vi.mocked(mockCoreContainer.field.createField).mockResolvedValue(mockResult);

        const result = await facade.createField(input);

        expect(mockCoreContainer.field.createField).toHaveBeenCalledWith(input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('updateField', () => {
      it('должна делегировать вызов FieldService.updateField', async () => {
        const fieldId = 'customField123';
        const input: UpdateFieldDto = { name: 'Updated Field' };
        const mockResult: FieldOutput = {
          id: 'customField123',
          self: 'https://api.tracker.yandex.net/v3/fields/customField123',
          key: 'customField123',
          name: 'Updated Field',
        };

        vi.mocked(mockCoreContainer.field.updateField).mockResolvedValue(mockResult);

        const result = await facade.updateField(fieldId, input);

        expect(mockCoreContainer.field.updateField).toHaveBeenCalledWith(fieldId, input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteField', () => {
      it('должна делегировать вызов FieldService.deleteField', async () => {
        const fieldId = 'customField123';

        vi.mocked(mockCoreContainer.field.deleteField).mockResolvedValue(undefined);

        await facade.deleteField(fieldId);

        expect(mockCoreContainer.field.deleteField).toHaveBeenCalledWith(fieldId);
      });
    });
  });

  describe('Board methods', () => {
    describe('getBoards', () => {
      it('должна делегировать вызов BoardService.getBoards без параметров', async () => {
        const mockResult: BoardsListOutput = [
          {
            id: '1',
            self: 'https://api.tracker.yandex.net/v3/boards/1',
            name: 'Board 1',
          },
        ];

        vi.mocked(mockProjectAgileContainer.board.getBoards).mockResolvedValue(mockResult);

        const result = await facade.getBoards();

        expect(mockProjectAgileContainer.board.getBoards).toHaveBeenCalledWith(undefined);
        expect(result).toEqual(mockResult);
      });

      it('должна делегировать вызов BoardService.getBoards с параметрами', async () => {
        const params: GetBoardsDto = { filter: 'active' };
        const mockResult: BoardsListOutput = [
          {
            id: '1',
            self: 'https://api.tracker.yandex.net/v3/boards/1',
            name: 'Active Board',
          },
        ];

        vi.mocked(mockProjectAgileContainer.board.getBoards).mockResolvedValue(mockResult);

        const result = await facade.getBoards(params);

        expect(mockProjectAgileContainer.board.getBoards).toHaveBeenCalledWith(params);
        expect(result).toEqual(mockResult);
      });
    });

    describe('getBoard', () => {
      it('должна делегировать вызов BoardService.getBoard', async () => {
        const boardId = '1';
        const mockResult: BoardOutput = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/boards/1',
          name: 'Sprint Board',
        };

        vi.mocked(mockProjectAgileContainer.board.getBoard).mockResolvedValue(mockResult);

        const result = await facade.getBoard(boardId);

        expect(mockProjectAgileContainer.board.getBoard).toHaveBeenCalledWith(boardId, undefined);
        expect(result).toEqual(mockResult);
      });

      it('должна делегировать вызов BoardService.getBoard с params', async () => {
        const boardId = '1';
        const params = { localized: true };
        const mockResult: BoardOutput = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/boards/1',
          name: 'Sprint Board',
        };

        vi.mocked(mockProjectAgileContainer.board.getBoard).mockResolvedValue(mockResult);

        const result = await facade.getBoard(boardId, params);

        expect(mockProjectAgileContainer.board.getBoard).toHaveBeenCalledWith(boardId, params);
        expect(result).toEqual(mockResult);
      });
    });

    describe('createBoard', () => {
      it('должна делегировать вызов BoardService.createBoard', async () => {
        const input: CreateBoardDto = { name: 'Sprint Board', filter: { query: 'status: open' } };
        const mockResult: BoardOutput = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/boards/1',
          name: 'Sprint Board',
        };

        vi.mocked(mockProjectAgileContainer.board.createBoard).mockResolvedValue(mockResult);

        const result = await facade.createBoard(input);

        expect(mockProjectAgileContainer.board.createBoard).toHaveBeenCalledWith(input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('updateBoard', () => {
      it('должна делегировать вызов BoardService.updateBoard', async () => {
        const boardId = '1';
        const input = { name: 'Updated Board' };
        const mockResult: BoardOutput = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/boards/1',
          name: 'Updated Board',
        };

        vi.mocked(mockProjectAgileContainer.board.updateBoard).mockResolvedValue(mockResult);

        const result = await facade.updateBoard(boardId, input);

        expect(mockProjectAgileContainer.board.updateBoard).toHaveBeenCalledWith(boardId, input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteBoard', () => {
      it('должна делегировать вызов BoardService.deleteBoard', async () => {
        const boardId = '1';

        vi.mocked(mockProjectAgileContainer.board.deleteBoard).mockResolvedValue(undefined);

        await facade.deleteBoard(boardId);

        expect(mockProjectAgileContainer.board.deleteBoard).toHaveBeenCalledWith(boardId);
      });
    });
  });

  describe('Sprint methods', () => {
    describe('getSprints', () => {
      it('должна делегировать вызов SprintService.getSprints', async () => {
        const boardId = '1';
        const mockResult: SprintsListOutput = [
          {
            id: '10',
            self: 'https://api.tracker.yandex.net/v3/sprints/10',
            name: 'Sprint 1',
          },
        ];

        vi.mocked(mockProjectAgileContainer.sprint.getSprints).mockResolvedValue(mockResult);

        const result = await facade.getSprints(boardId);

        expect(mockProjectAgileContainer.sprint.getSprints).toHaveBeenCalledWith(boardId);
        expect(result).toEqual(mockResult);
      });
    });

    describe('getSprint', () => {
      it('должна делегировать вызов SprintService.getSprint', async () => {
        const sprintId = '10';
        const mockResult: SprintOutput = {
          id: '10',
          self: 'https://api.tracker.yandex.net/v3/sprints/10',
          name: 'Sprint 1',
        };

        vi.mocked(mockProjectAgileContainer.sprint.getSprint).mockResolvedValue(mockResult);

        const result = await facade.getSprint(sprintId);

        expect(mockProjectAgileContainer.sprint.getSprint).toHaveBeenCalledWith(sprintId);
        expect(result).toEqual(mockResult);
      });
    });

    describe('createSprint', () => {
      it('должна делегировать вызов SprintService.createSprint', async () => {
        const input: CreateSprintDto = {
          name: 'Sprint 1',
          boardId: '1',
          startDate: '2024-01-01',
          endDate: '2024-01-14',
        };
        const mockResult: SprintOutput = {
          id: '10',
          self: 'https://api.tracker.yandex.net/v3/sprints/10',
          name: 'Sprint 1',
        };

        vi.mocked(mockProjectAgileContainer.sprint.createSprint).mockResolvedValue(mockResult);

        const result = await facade.createSprint(input);

        expect(mockProjectAgileContainer.sprint.createSprint).toHaveBeenCalledWith(input);
        expect(result).toEqual(mockResult);
      });
    });

    describe('updateSprint', () => {
      it('должна делегировать вызов SprintService.updateSprint', async () => {
        const sprintId = '10';
        const input = { name: 'Sprint 1 Updated' };
        const mockResult: SprintOutput = {
          id: '10',
          self: 'https://api.tracker.yandex.net/v3/sprints/10',
          name: 'Sprint 1 Updated',
        };

        vi.mocked(mockProjectAgileContainer.sprint.updateSprint).mockResolvedValue(mockResult);

        const result = await facade.updateSprint(sprintId, input);

        expect(mockProjectAgileContainer.sprint.updateSprint).toHaveBeenCalledWith(sprintId, input);
        expect(result).toEqual(mockResult);
      });
    });
  });
});
