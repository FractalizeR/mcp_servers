/**
 * Unit tests for IssueService
 *
 * Проверяет:
 * - Конструктор с 7 параметрами (операциями)
 * - Делегирование вызовов соответствующим операциям
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueService } from '#tracker_api/facade/services/issue.service.js';
import type { GetIssuesOperation } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';
import type { CreateIssueOperation } from '#tracker_api/api_operations/issue/create/create-issue.operation.js';
import type { UpdateIssueOperation } from '#tracker_api/api_operations/issue/update/update-issue.operation.js';
import type { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import type { GetIssueTransitionsOperation } from '#tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.js';
import type { TransitionIssueOperation } from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesResult } from '#tracker_api/api_operations/issue/find/index.js';
import type { BatchChangelogResult } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import type {
  IssueWithUnknownFields,
  TransitionWithUnknownFields,
} from '#tracker_api/entities/index.js';

// Fixtures
function createIssueFixture(overrides = {}): IssueWithUnknownFields {
  return {
    id: '1',
    key: 'TEST-1',
    summary: 'Test Issue',
    queue: { id: '1', key: 'TEST', name: 'Test Queue' },
    status: { id: '1', key: 'open', display: 'Open' },
    createdBy: { uid: '1', display: 'User', login: 'user', isActive: true },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function createTransitionFixture(overrides = {}): TransitionWithUnknownFields {
  return {
    id: 'trans1',
    self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/transitions/trans1',
    to: { id: '2', key: 'inProgress', display: 'In Progress' },
    ...overrides,
  };
}

describe('IssueService', () => {
  let service: IssueService;
  let mockGetIssuesOp: GetIssuesOperation;
  let mockFindIssuesOp: FindIssuesOperation;
  let mockCreateIssueOp: CreateIssueOperation;
  let mockUpdateIssueOp: UpdateIssueOperation;
  let mockGetIssueChangelogOp: GetIssueChangelogOperation;
  let mockGetIssueTransitionsOp: GetIssueTransitionsOperation;
  let mockTransitionIssueOp: TransitionIssueOperation;

  beforeEach(() => {
    mockGetIssuesOp = { execute: vi.fn() } as unknown as GetIssuesOperation;
    mockFindIssuesOp = { execute: vi.fn() } as unknown as FindIssuesOperation;
    mockCreateIssueOp = { execute: vi.fn() } as unknown as CreateIssueOperation;
    mockUpdateIssueOp = { execute: vi.fn() } as unknown as UpdateIssueOperation;
    mockGetIssueChangelogOp = { execute: vi.fn() } as unknown as GetIssueChangelogOperation;
    mockGetIssueTransitionsOp = { execute: vi.fn() } as unknown as GetIssueTransitionsOperation;
    mockTransitionIssueOp = { execute: vi.fn() } as unknown as TransitionIssueOperation;

    service = new IssueService(
      mockGetIssuesOp,
      mockFindIssuesOp,
      mockCreateIssueOp,
      mockUpdateIssueOp,
      mockGetIssueChangelogOp,
      mockGetIssueTransitionsOp,
      mockTransitionIssueOp
    );
  });

  describe('constructor', () => {
    it('должен создать сервис с 7 операциями', () => {
      expect(service).toBeDefined();
      expect(service.getIssues).toBeDefined();
      expect(service.findIssues).toBeDefined();
      expect(service.createIssue).toBeDefined();
      expect(service.updateIssue).toBeDefined();
      expect(service.getIssueChangelog).toBeDefined();
      expect(service.getIssueTransitions).toBeDefined();
      expect(service.transitionIssue).toBeDefined();
    });
  });

  describe('getIssues', () => {
    it('должен делегировать вызов GetIssuesOperation', async () => {
      const issueKeys = ['TEST-1', 'TEST-2'];
      const mockResult: BatchIssueResult[] = [
        { status: 'fulfilled', value: createIssueFixture(), key: 'TEST-1', index: 0 },
        {
          status: 'fulfilled',
          value: createIssueFixture({ key: 'TEST-2' }),
          key: 'TEST-2',
          index: 1,
        },
      ];

      vi.mocked(mockGetIssuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.getIssues(issueKeys);

      expect(mockGetIssuesOp.execute).toHaveBeenCalledWith(issueKeys);
      expect(result).toBe(mockResult);
    });

    it('должен обрабатывать пустой массив', async () => {
      const mockResult: BatchIssueResult[] = [];
      vi.mocked(mockGetIssuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.getIssues([]);

      expect(mockGetIssuesOp.execute).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('должен пробрасывать ошибки от операции', async () => {
      const error = new Error('API Error');
      vi.mocked(mockGetIssuesOp.execute).mockRejectedValue(error);

      await expect(service.getIssues(['TEST-1'])).rejects.toThrow('API Error');
    });
  });

  describe('findIssues', () => {
    it('должен делегировать вызов FindIssuesOperation', async () => {
      const params = { query: 'status: open', perPage: 50 };
      const mockResult: FindIssuesResult = [createIssueFixture()];

      vi.mocked(mockFindIssuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.findIssues(params);

      expect(mockFindIssuesOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });

    it('должен поддерживать поиск по filter', async () => {
      const params = { filter: { status: 'open' } };
      const mockResult: FindIssuesResult = [];

      vi.mocked(mockFindIssuesOp.execute).mockResolvedValue(mockResult);

      const result = await service.findIssues(params);

      expect(mockFindIssuesOp.execute).toHaveBeenCalledWith(params);
      expect(result).toEqual([]);
    });
  });

  describe('createIssue', () => {
    it('должен делегировать вызов CreateIssueOperation', async () => {
      const issueData = { queue: 'TEST', summary: 'New Issue' };
      const mockResult = createIssueFixture({ summary: 'New Issue' });

      vi.mocked(mockCreateIssueOp.execute).mockResolvedValue(mockResult);

      const result = await service.createIssue(issueData);

      expect(mockCreateIssueOp.execute).toHaveBeenCalledWith(issueData);
      expect(result).toBe(mockResult);
    });

    it('должен поддерживать дополнительные поля при создании', async () => {
      const issueData = {
        queue: 'TEST',
        summary: 'New Issue',
        description: 'Description',
        priority: 'critical',
      };
      const mockResult = createIssueFixture();

      vi.mocked(mockCreateIssueOp.execute).mockResolvedValue(mockResult);

      await service.createIssue(issueData);

      expect(mockCreateIssueOp.execute).toHaveBeenCalledWith(issueData);
    });
  });

  describe('updateIssue', () => {
    it('должен делегировать вызов UpdateIssueOperation', async () => {
      const issueKey = 'TEST-1';
      const updateData = { summary: 'Updated Summary' };
      const mockResult = createIssueFixture({ summary: 'Updated Summary' });

      vi.mocked(mockUpdateIssueOp.execute).mockResolvedValue(mockResult);

      const result = await service.updateIssue(issueKey, updateData);

      expect(mockUpdateIssueOp.execute).toHaveBeenCalledWith(issueKey, updateData);
      expect(result).toBe(mockResult);
    });
  });

  describe('getIssueChangelog', () => {
    it('должен делегировать вызов GetIssueChangelogOperation', async () => {
      const issueKeys = ['TEST-1'];
      const mockResult: BatchChangelogResult[] = [
        {
          status: 'fulfilled',
          value: [
            {
              id: '1',
              self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/changelog/1',
              issue: { id: '1', key: 'TEST-1', display: 'Test Issue' },
              updatedAt: '2024-01-01',
              updatedBy: { uid: '1', display: 'User', login: 'user', isActive: true },
              type: 'IssueUpdated',
              fields: [],
            },
          ],
          key: 'TEST-1',
          index: 0,
        },
      ];

      vi.mocked(mockGetIssueChangelogOp.execute).mockResolvedValue(mockResult);

      const result = await service.getIssueChangelog(issueKeys);

      expect(mockGetIssueChangelogOp.execute).toHaveBeenCalledWith(issueKeys);
      expect(result).toBe(mockResult);
    });
  });

  describe('getIssueTransitions', () => {
    it('должен делегировать вызов GetIssueTransitionsOperation', async () => {
      const issueKey = 'TEST-1';
      const mockResult: TransitionWithUnknownFields[] = [createTransitionFixture()];

      vi.mocked(mockGetIssueTransitionsOp.execute).mockResolvedValue(mockResult);

      const result = await service.getIssueTransitions(issueKey);

      expect(mockGetIssueTransitionsOp.execute).toHaveBeenCalledWith(issueKey);
      expect(result).toBe(mockResult);
    });

    it('должен возвращать пустой массив если переходов нет', async () => {
      vi.mocked(mockGetIssueTransitionsOp.execute).mockResolvedValue([]);

      const result = await service.getIssueTransitions('TEST-1');

      expect(result).toEqual([]);
    });
  });

  describe('transitionIssue', () => {
    it('должен делегировать вызов TransitionIssueOperation без данных', async () => {
      const issueKey = 'TEST-1';
      const transitionId = 'trans1';
      const mockResult = createIssueFixture({
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
      });

      vi.mocked(mockTransitionIssueOp.execute).mockResolvedValue(mockResult);

      const result = await service.transitionIssue(issueKey, transitionId);

      expect(mockTransitionIssueOp.execute).toHaveBeenCalledWith(issueKey, transitionId, undefined);
      expect(result).toBe(mockResult);
    });

    it('должен делегировать вызов TransitionIssueOperation с данными', async () => {
      const issueKey = 'TEST-1';
      const transitionId = 'trans1';
      const transitionData = { comment: 'Moving to progress', resolution: 'fixed' };
      const mockResult = createIssueFixture();

      vi.mocked(mockTransitionIssueOp.execute).mockResolvedValue(mockResult);

      const result = await service.transitionIssue(issueKey, transitionId, transitionData);

      expect(mockTransitionIssueOp.execute).toHaveBeenCalledWith(
        issueKey,
        transitionId,
        transitionData
      );
      expect(result).toBe(mockResult);
    });
  });
});
