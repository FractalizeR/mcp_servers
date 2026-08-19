import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';
import {
  IssueRefetchAfterTransitionError,
  TransitionIssueOperation,
} from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';
import {
  EntityCacheKey,
  EntityType,
} from '@fractalizer/mcp-infrastructure/cache/entity-cache-key.js';
import { createQueueFixture } from '#helpers/queue.fixture.js';

describe('TransitionIssueOperation', () => {
  let operation: TransitionIssueOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  // Ответ реального API v3 на POST `_execute` — список переходов, доступных
  // из НОВОГО статуса (id/self/to/screen), а НЕ задача. См. референс:
  // yandex_tracker_client/collections.py (IssueTransitions) и
  // yandex_tracker_client/tests/smoke/issues/test_issues_transition.py
  // (test_issue_transition_execute мокает ответ `_execute` списком переходов).
  const mockExecuteResponse = [
    {
      id: 'close',
      self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/transitions/close',
      to: { id: '3', key: 'closed', display: 'Closed' },
    },
  ];

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
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

    operation = new TransitionIssueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct URL and transition data', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';
      const transitionData: ExecuteTransitionDto = {
        comment: 'Moving to In Progress',
      };

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: createQueueFixture({ id: '1', key: 'TEST', name: 'Test Queue' }),
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId, transitionData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v3/issues/TEST-123/transitions/transition1/_execute',
        transitionData
      );
      expect(result).toEqual(mockUpdatedIssue);
    });

    it('должен дочитывать задачу отдельным GET после успешного перехода (ответ _execute — не задача)', async () => {
      const issueKey = 'PROJ-456';
      const transitionId = 'close';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '2',
        key: 'PROJ-456',
        summary: 'Completed Task',
        queue: createQueueFixture({ id: '2', key: 'PROJ', name: 'Project' }),
        status: { id: '3', key: 'closed', display: 'Closed' },
        createdBy: { uid: 'user2', display: 'User 2', login: 'user2', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/PROJ-456');
      expect(result).toEqual(mockUpdatedIssue);
      expect(result.status.key).toBe('closed');
    });

    it('должен возвращать полный набор полей задачи (регрессия: ранее возвращался Transition вместо Issue)', async () => {
      const issueKey = 'PROJ-789';
      const transitionId = 'start';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '3',
        key: 'PROJ-789',
        summary: 'Some task',
        queue: createQueueFixture({ id: '2', key: 'PROJ', name: 'Project' }),
        status: { id: '4', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user3', display: 'User 3', login: 'user3', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId);

      // Поля, которых нет в ответе _execute (id транзишна/self/to/screen),
      // но которые ЕСТЬ у задачи, обязаны присутствовать в результате.
      expect(result).toHaveProperty('key', 'PROJ-789');
      expect(result).toHaveProperty('summary', 'Some task');
      expect(result).toHaveProperty('queue');
      expect(result).not.toHaveProperty('screen');
      expect(result).not.toHaveProperty('to');
    });

    it('should invalidate cache before re-fetching the issue', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: createQueueFixture({ id: '1', key: 'TEST', name: 'Test Queue' }),
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, transitionId);

      const expectedCacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
      expect(mockCacheManager.delete).toHaveBeenCalledWith(expectedCacheKey);

      // Инвалидация кеша должна произойти ДО дочитывания, чтобы GET не мог
      // случайно получить устаревшее значение из внешнего кеширующего слоя.
      const deleteOrder = vi.mocked(mockCacheManager.delete).mock.invocationCallOrder[0];
      const getOrder = vi.mocked(mockHttpClient.get).mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(getOrder as number);
    });

    it('should handle invalid transition errors (400) from _execute without calling GET', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'invalid-transition';

      const mockError = new Error('HTTP 400: Invalid transition');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, transitionId)).rejects.toThrow(
        'HTTP 400: Invalid transition'
      );
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle not found errors (404) from _execute', async () => {
      const issueKey = 'NOTFOUND-999';
      const transitionId = 'transition1';

      const mockError = new Error('HTTP 404: Issue not found');
      vi.mocked(mockHttpClient.post).mockRejectedValue(mockError);

      await expect(operation.execute(issueKey, transitionId)).rejects.toThrow(
        'HTTP 404: Issue not found'
      );
    });

    it('находка №1 (BLOCKER): провал GET после успешного POST НЕ должен выглядеть как провал перехода — бросает IssueRefetchAfterTransitionError, а не исходную ошибку GET', async () => {
      // Регрессионный тест на находку №1: раньше ошибка GET (429/сеть/таймаут)
      // пробрасывалась наверх один-в-один и неотличимо от провала самого
      // перехода — TransitionIssueTool ловил её и возвращал success:false,
      // хотя POST `_execute` уже отработал. Переход не идемпотентен: агент,
      // поверив в отказ, рисковал либо получить 4xx при повторе, либо
      // выполнить ВТОРОЙ переход. Теперь провал GET оборачивается в
      // специализированный класс ошибки, различимый вызывающим кодом
      // (`TransitionIssueTool`), вместо голого `Error('HTTP 500: ...')`.
      const issueKey = 'TEST-500';
      const transitionId = 'transition1';

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      const getError = new Error('HTTP 500: Internal error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(getError);

      await expect(operation.execute(issueKey, transitionId)).rejects.toBeInstanceOf(
        IssueRefetchAfterTransitionError
      );

      try {
        await operation.execute(issueKey, transitionId);
        expect.unreachable('ожидалась ошибка IssueRefetchAfterTransitionError');
      } catch (error) {
        expect(error).toBeInstanceOf(IssueRefetchAfterTransitionError);
        const refetchError = error as IssueRefetchAfterTransitionError;
        expect(refetchError.issueKey).toBe(issueKey);
        expect(refetchError.transitionId).toBe(transitionId);
        expect(refetchError.cause).toBe(getError);
      }

      // POST (сам переход) уже был выполнен успешно — это и есть источник
      // блокера: факт перехода зафиксирован сервером ДО провала GET.
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/v3/issues/${issueKey}/transitions/${transitionId}/_execute`,
        {}
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log transition success using the status from the re-fetched issue (not from _execute)', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      const mockUpdatedIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: createQueueFixture({ id: '1', key: 'TEST', name: 'Test Queue' }),
        status: { id: '2', key: 'inProgress', display: 'In Progress' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      await operation.execute(issueKey, transitionId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Выполнение перехода ${transitionId} для задачи ${issueKey}`,
        {
          hasData: false,
        }
      );
      // Регрессия: раньше логировался status?.key ответа _execute (Transition,
      // без поля status) → в логе всегда было "unknown", даже при успешном
      // переходе. Теперь статус берётся из дочитанной задачи.
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Переход выполнен успешно: ${issueKey} → inProgress`
      );
    });

    it('should log "unknown" only when the re-fetched issue genuinely has no status', async () => {
      const issueKey = 'TEST-123';
      const transitionId = 'transition1';

      const mockUpdatedIssue = {
        id: '1',
        key: 'TEST-123',
        summary: 'Test Issue',
        queue: { id: '1', key: 'TEST', name: 'Test Queue' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
      } as IssueWithUnknownFields;

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockExecuteResponse);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockUpdatedIssue);

      const result = await operation.execute(issueKey, transitionId);

      expect(result).toEqual(mockUpdatedIssue);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Переход выполнен успешно: ${issueKey} → unknown`
      );
    });
  });
});
