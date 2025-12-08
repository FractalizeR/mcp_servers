/**
 * Unit tests for YandexTrackerFacade batch methods
 *
 * Дополняет основной тест фасада покрытием batch/many методов:
 * - Links: createLinksMany, deleteLinksMany
 * - Comments: addCommentsMany, getCommentsMany, editCommentsMany, deleteCommentsMany
 * - Checklist: getChecklistMany, addChecklistItemMany, updateChecklistItemMany, deleteChecklistItemMany
 * - Worklogs: getWorklogsMany, addWorklogsMany
 * - Attachments: getAttachmentsMany
 * - Bulk Change: bulkUpdateIssues, bulkTransitionIssues, bulkMoveIssues, getBulkChangeStatus
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type {
  CoreServicesContainer,
  IssueServicesContainer,
  QueueServicesContainer,
  ProjectAgileServicesContainer,
} from '#tracker_api/facade/services/containers/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';

describe('YandexTrackerFacade - Batch Methods', () => {
  let facade: YandexTrackerFacade;

  // Mock Containers
  let mockCoreContainer: CoreServicesContainer;
  let mockIssuesContainer: IssueServicesContainer;
  let mockQueuesContainer: QueueServicesContainer;
  let mockProjectAgileContainer: ProjectAgileServicesContainer;

  beforeEach(() => {
    // Create mock containers with services
    mockCoreContainer = {
      user: { ping: vi.fn() },
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
        createLinksMany: vi.fn(),
        deleteLink: vi.fn(),
        deleteLinksMany: vi.fn(),
      },
      attachment: {
        getAttachments: vi.fn(),
        getAttachmentsMany: vi.fn(),
        uploadAttachment: vi.fn(),
        downloadAttachment: vi.fn(),
        deleteAttachment: vi.fn(),
        getThumbnail: vi.fn(),
      },
      comment: {
        addComment: vi.fn(),
        addCommentsMany: vi.fn(),
        getComments: vi.fn(),
        getCommentsMany: vi.fn(),
        editComment: vi.fn(),
        editCommentsMany: vi.fn(),
        deleteComment: vi.fn(),
        deleteCommentsMany: vi.fn(),
      },
      checklist: {
        getChecklist: vi.fn(),
        getChecklistMany: vi.fn(),
        addChecklistItem: vi.fn(),
        addChecklistItemMany: vi.fn(),
        updateChecklistItem: vi.fn(),
        updateChecklistItemMany: vi.fn(),
        deleteChecklistItem: vi.fn(),
        deleteChecklistItemMany: vi.fn(),
      },
      worklog: {
        getWorklogs: vi.fn(),
        getWorklogsMany: vi.fn(),
        addWorklog: vi.fn(),
        addWorklogsMany: vi.fn(),
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

  // === Link Batch Methods ===

  describe('createLinksMany', () => {
    it('должна делегировать вызов IssueLinkService.createLinksMany', async () => {
      const links = [
        { issueId: 'TEST-1', relationship: 'relates' as const, targetIssue: 'TEST-2' },
        { issueId: 'TEST-3', relationship: 'depends' as const, targetIssue: 'TEST-4' },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'link1' } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.link.createLinksMany).mockResolvedValue(mockResult);

      const result = await facade.createLinksMany(links);

      expect(mockIssuesContainer.link.createLinksMany).toHaveBeenCalledWith(links);
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteLinksMany', () => {
    it('должна делегировать вызов IssueLinkService.deleteLinksMany', async () => {
      const links = [
        { issueId: 'TEST-1', linkId: 'link1' },
        { issueId: 'TEST-2', linkId: 'link2' },
      ];
      const mockResult: BatchResult<string, void> = {
        successful: [{ id: 'TEST-1', result: undefined }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.link.deleteLinksMany).mockResolvedValue(mockResult);

      const result = await facade.deleteLinksMany(links);

      expect(mockIssuesContainer.link.deleteLinksMany).toHaveBeenCalledWith(links);
      expect(result).toBe(mockResult);
    });
  });

  // === Comment Batch Methods ===

  describe('addCommentsMany', () => {
    it('должна делегировать вызов CommentService.addCommentsMany', async () => {
      const comments = [
        { issueId: 'TEST-1', text: 'Comment 1' },
        { issueId: 'TEST-2', text: 'Comment 2', attachmentIds: ['att1'] },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'comment1', text: 'Comment 1' } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.comment.addCommentsMany).mockResolvedValue(mockResult);

      const result = await facade.addCommentsMany(comments);

      expect(mockIssuesContainer.comment.addCommentsMany).toHaveBeenCalledWith(comments);
      expect(result).toBe(mockResult);
    });
  });

  describe('getCommentsMany', () => {
    it('должна делегировать вызов CommentService.getCommentsMany', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const mockResult: BatchResult<string, unknown[]> = {
        successful: [{ id: 'TEST-1', result: [{ id: 'comment1' }] }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.comment.getCommentsMany).mockResolvedValue(mockResult);

      const result = await facade.getCommentsMany(issueIds);

      expect(mockIssuesContainer.comment.getCommentsMany).toHaveBeenCalledWith(issueIds, undefined);
      expect(result).toBe(mockResult);
    });

    it('должна передавать параметры запроса', async () => {
      const issueIds = ['TEST-1'];
      const input = { perPage: 10 };
      const mockResult: BatchResult<string, unknown[]> = {
        successful: [],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.comment.getCommentsMany).mockResolvedValue(mockResult);

      await facade.getCommentsMany(issueIds, input);

      expect(mockIssuesContainer.comment.getCommentsMany).toHaveBeenCalledWith(issueIds, input);
    });
  });

  describe('editCommentsMany', () => {
    it('должна делегировать вызов CommentService.editCommentsMany', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: 'c1', text: 'Updated 1' },
        { issueId: 'TEST-2', commentId: 'c2', text: 'Updated 2' },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'c1', text: 'Updated 1' } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.comment.editCommentsMany).mockResolvedValue(mockResult);

      const result = await facade.editCommentsMany(comments);

      expect(mockIssuesContainer.comment.editCommentsMany).toHaveBeenCalledWith(comments);
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteCommentsMany', () => {
    it('должна делегировать вызов CommentService.deleteCommentsMany', async () => {
      const comments = [
        { issueId: 'TEST-1', commentId: 'c1' },
        { issueId: 'TEST-2', commentId: 'c2' },
      ];
      const mockResult: BatchResult<string, void> = {
        successful: [{ id: 'TEST-1', result: undefined }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.comment.deleteCommentsMany).mockResolvedValue(mockResult);

      const result = await facade.deleteCommentsMany(comments);

      expect(mockIssuesContainer.comment.deleteCommentsMany).toHaveBeenCalledWith(comments);
      expect(result).toBe(mockResult);
    });
  });

  // === Checklist Batch Methods ===

  describe('getChecklistMany', () => {
    it('должна делегировать вызов ChecklistService.getChecklistMany', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const mockResult: BatchResult<string, unknown[]> = {
        successful: [{ id: 'TEST-1', result: [{ id: 'item1', text: 'Item 1' }] }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.checklist.getChecklistMany).mockResolvedValue(mockResult);

      const result = await facade.getChecklistMany(issueIds);

      expect(mockIssuesContainer.checklist.getChecklistMany).toHaveBeenCalledWith(issueIds);
      expect(result).toBe(mockResult);
    });
  });

  describe('addChecklistItemMany', () => {
    it('должна делегировать вызов ChecklistService.addChecklistItemMany', async () => {
      const items = [
        { issueId: 'TEST-1', text: 'Task 1' },
        { issueId: 'TEST-2', text: 'Task 2', checked: true },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'item1', text: 'Task 1' } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.checklist.addChecklistItemMany).mockResolvedValue(mockResult);

      const result = await facade.addChecklistItemMany(items);

      expect(mockIssuesContainer.checklist.addChecklistItemMany).toHaveBeenCalledWith(items);
      expect(result).toBe(mockResult);
    });
  });

  describe('updateChecklistItemMany', () => {
    it('должна делегировать вызов ChecklistService.updateChecklistItemMany', async () => {
      const items = [
        { issueId: 'TEST-1', checklistItemId: 'item1', checked: true },
        { issueId: 'TEST-2', checklistItemId: 'item2', text: 'Updated' },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'item1', checked: true } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.checklist.updateChecklistItemMany).mockResolvedValue(
        mockResult
      );

      const result = await facade.updateChecklistItemMany(items);

      expect(mockIssuesContainer.checklist.updateChecklistItemMany).toHaveBeenCalledWith(items);
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteChecklistItemMany', () => {
    it('должна делегировать вызов ChecklistService.deleteChecklistItemMany', async () => {
      const items = [
        { issueId: 'TEST-1', itemId: 'item1' },
        { issueId: 'TEST-2', itemId: 'item2' },
      ];
      const mockResult: BatchResult<string, void> = {
        successful: [{ id: 'TEST-1', result: undefined }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.checklist.deleteChecklistItemMany).mockResolvedValue(
        mockResult
      );

      const result = await facade.deleteChecklistItemMany(items);

      expect(mockIssuesContainer.checklist.deleteChecklistItemMany).toHaveBeenCalledWith(items);
      expect(result).toBe(mockResult);
    });
  });

  // === Worklog Batch Methods ===

  describe('getWorklogsMany', () => {
    it('должна делегировать вызов WorklogService.getWorklogsMany', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const mockResult: BatchResult<string, unknown[]> = {
        successful: [{ id: 'TEST-1', result: [{ id: 'wl1', duration: 'PT1H' }] }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.worklog.getWorklogsMany).mockResolvedValue(mockResult);

      const result = await facade.getWorklogsMany(issueIds);

      expect(mockIssuesContainer.worklog.getWorklogsMany).toHaveBeenCalledWith(issueIds);
      expect(result).toBe(mockResult);
    });
  });

  describe('addWorklogsMany', () => {
    it('должна делегировать вызов WorklogService.addWorklogsMany', async () => {
      const worklogs = [
        { issueId: 'TEST-1', start: '2024-01-01', duration: 'PT1H' },
        { issueId: 'TEST-2', start: '2024-01-02', duration: 'PT2H', comment: 'Work done' },
      ];
      const mockResult: BatchResult<string, unknown> = {
        successful: [{ id: 'TEST-1', result: { id: 'wl1', duration: 'PT1H' } }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.worklog.addWorklogsMany).mockResolvedValue(mockResult);

      const result = await facade.addWorklogsMany(worklogs);

      expect(mockIssuesContainer.worklog.addWorklogsMany).toHaveBeenCalledWith(worklogs);
      expect(result).toBe(mockResult);
    });
  });

  // === Attachment Batch Methods ===

  describe('getAttachmentsMany', () => {
    it('должна делегировать вызов IssueAttachmentService.getAttachmentsMany', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const mockResult: BatchResult<string, unknown[]> = {
        successful: [{ id: 'TEST-1', result: [{ id: 'att1', name: 'file.txt' }] }],
        failed: [],
      };

      vi.mocked(mockIssuesContainer.attachment.getAttachmentsMany).mockResolvedValue(mockResult);

      const result = await facade.getAttachmentsMany(issueIds);

      expect(mockIssuesContainer.attachment.getAttachmentsMany).toHaveBeenCalledWith(issueIds);
      expect(result).toBe(mockResult);
    });
  });

  // === Bulk Change Methods ===

  describe('bulkUpdateIssues', () => {
    it('должна делегировать вызов BulkChangeService.bulkUpdateIssues', async () => {
      const params = {
        issues: ['TEST-1', 'TEST-2'],
        values: { priority: 'minor' },
      };
      const mockResult = {
        id: 'op1',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op1',
        status: 'RUNNING',
      };

      vi.mocked(mockProjectAgileContainer.bulkChange.bulkUpdateIssues).mockResolvedValue(
        mockResult
      );

      const result = await facade.bulkUpdateIssues(params);

      expect(mockProjectAgileContainer.bulkChange.bulkUpdateIssues).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });

  describe('bulkTransitionIssues', () => {
    it('должна делегировать вызов BulkChangeService.bulkTransitionIssues', async () => {
      const params = {
        issues: ['TEST-1', 'TEST-2'],
        transition: 'close',
        values: { resolution: 'fixed' },
      };
      const mockResult = {
        id: 'op2',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op2',
        status: 'RUNNING',
      };

      vi.mocked(mockProjectAgileContainer.bulkChange.bulkTransitionIssues).mockResolvedValue(
        mockResult
      );

      const result = await facade.bulkTransitionIssues(params);

      expect(mockProjectAgileContainer.bulkChange.bulkTransitionIssues).toHaveBeenCalledWith(
        params
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('bulkMoveIssues', () => {
    it('должна делегировать вызов BulkChangeService.bulkMoveIssues', async () => {
      const params = {
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
        moveAllFields: true,
      };
      const mockResult = {
        id: 'op3',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op3',
        status: 'RUNNING',
      };

      vi.mocked(mockProjectAgileContainer.bulkChange.bulkMoveIssues).mockResolvedValue(mockResult);

      const result = await facade.bulkMoveIssues(params);

      expect(mockProjectAgileContainer.bulkChange.bulkMoveIssues).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResult);
    });
  });

  describe('getBulkChangeStatus', () => {
    it('должна делегировать вызов BulkChangeService.getBulkChangeStatus', async () => {
      const operationId = 'op1';
      const mockResult = {
        id: 'op1',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op1',
        status: 'COMPLETED',
        processedIssues: 10,
        totalIssues: 10,
      };

      vi.mocked(mockProjectAgileContainer.bulkChange.getBulkChangeStatus).mockResolvedValue(
        mockResult
      );

      const result = await facade.getBulkChangeStatus(operationId);

      expect(mockProjectAgileContainer.bulkChange.getBulkChangeStatus).toHaveBeenCalledWith(
        operationId
      );
      expect(result).toBe(mockResult);
    });

    it('должна возвращать статус FAILED при ошибке', async () => {
      const operationId = 'op-failed';
      const mockResult = {
        id: 'op-failed',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op-failed',
        status: 'FAILED',
        processedIssues: 5,
        totalIssues: 10,
      };

      vi.mocked(mockProjectAgileContainer.bulkChange.getBulkChangeStatus).mockResolvedValue(
        mockResult
      );

      const result = await facade.getBulkChangeStatus(operationId);

      expect(result.status).toBe('FAILED');
    });
  });

  // === Attachment Single Methods (для полноты покрытия) ===

  describe('getAttachments', () => {
    it('должна делегировать вызов IssueAttachmentService.getAttachments', async () => {
      const issueId = 'TEST-1';
      const mockResult = [{ id: 'att1', name: 'file.txt', mimetype: 'text/plain' }];

      vi.mocked(mockIssuesContainer.attachment.getAttachments).mockResolvedValue(mockResult);

      const result = await facade.getAttachments(issueId);

      expect(mockIssuesContainer.attachment.getAttachments).toHaveBeenCalledWith(issueId);
      expect(result).toBe(mockResult);
    });
  });

  describe('uploadAttachment', () => {
    it('должна делегировать вызов IssueAttachmentService.uploadAttachment', async () => {
      const issueId = 'TEST-1';
      const input = { filename: 'test.txt', file: Buffer.from('test'), mimetype: 'text/plain' };
      const mockResult = { id: 'att1', name: 'test.txt', mimetype: 'text/plain' };

      vi.mocked(mockIssuesContainer.attachment.uploadAttachment).mockResolvedValue(mockResult);

      const result = await facade.uploadAttachment(issueId, input);

      expect(mockIssuesContainer.attachment.uploadAttachment).toHaveBeenCalledWith(issueId, input);
      expect(result).toBe(mockResult);
    });
  });

  describe('downloadAttachment', () => {
    it('должна делегировать вызов IssueAttachmentService.downloadAttachment', async () => {
      const mockResult = { content: Buffer.from('test'), filename: 'test.txt' };

      vi.mocked(mockIssuesContainer.attachment.downloadAttachment).mockResolvedValue(mockResult);

      const result = await facade.downloadAttachment('TEST-1', 'att1', 'test.txt');

      expect(mockIssuesContainer.attachment.downloadAttachment).toHaveBeenCalledWith(
        'TEST-1',
        'att1',
        'test.txt',
        undefined
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteAttachment', () => {
    it('должна делегировать вызов IssueAttachmentService.deleteAttachment', async () => {
      vi.mocked(mockIssuesContainer.attachment.deleteAttachment).mockResolvedValue(undefined);

      await facade.deleteAttachment('TEST-1', 'att1');

      expect(mockIssuesContainer.attachment.deleteAttachment).toHaveBeenCalledWith(
        'TEST-1',
        'att1'
      );
    });
  });

  describe('getThumbnail', () => {
    it('должна делегировать вызов IssueAttachmentService.getThumbnail', async () => {
      const mockResult = { content: Buffer.from('thumbnail'), filename: 'thumb.jpg' };

      vi.mocked(mockIssuesContainer.attachment.getThumbnail).mockResolvedValue(mockResult);

      const result = await facade.getThumbnail('TEST-1', 'att1');

      expect(mockIssuesContainer.attachment.getThumbnail).toHaveBeenCalledWith(
        'TEST-1',
        'att1',
        undefined
      );
      expect(result).toBe(mockResult);
    });
  });
});
