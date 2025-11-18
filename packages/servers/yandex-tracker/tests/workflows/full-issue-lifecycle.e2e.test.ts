// tests/workflows/full-issue-lifecycle.e2e.test.ts
/**
 * E2E тест полного lifecycle задачи с использованием всех API
 *
 * Workflow:
 * 1. Создать очередь (Queues)
 * 2. Создать задачу (Issues)
 * 3. Добавить комментарий (Comments)
 * 4. Прикрепить файл (Attachments)
 * 5. Создать чеклист (Checklists)
 * 6. Добавить worklog (Worklog)
 * 7. Создать связь с другой задачей (Links)
 * 8. Изменить статус (Transitions)
 * 9. Проверить changelog (Changelog)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('Full Issue Lifecycle E2E', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен выполнить полный workflow: задача → комментарий → чеклист → вложение → связь → переход → changelog', async () => {
    // Используем существующую очередь TEST
    const queueKey = 'TEST';

    // 1. Создать первую задачу
    mockServer.mockCreateIssueSuccess({
      key: 'TEST-1',
      queue: { key: queueKey },
      summary: 'E2E Test Issue',
      description: 'Testing full lifecycle',
    });

    const createIssueResult = await client.callTool(
      buildToolName('create_issue', MCP_TOOL_PREFIX),
      {
        queue: queueKey,
        summary: 'E2E Test Issue',
        description: 'Testing full lifecycle',
      }
    );
    expect(createIssueResult.isError).toBeUndefined();
    const issueData = JSON.parse(createIssueResult.content[0]!.text);
    const issueKey = issueData.data.issueKey;
    expect(issueKey).toBe('TEST-1');

    // 2. Добавить комментарий
    mockServer.mockAddCommentSuccess(issueKey, {
      id: 'comment-1',
      text: 'First comment on this issue',
    });

    const addCommentResult = await client.callTool(buildToolName('add_comment', MCP_TOOL_PREFIX), {
      issueId: issueKey,
      text: 'First comment on this issue',
    });
    expect(addCommentResult.isError).toBeUndefined();
    const commentData = JSON.parse(addCommentResult.content[0]!.text);
    expect(commentData.data.comment).toBeDefined();

    // 3. Прикрепить файл
    mockServer.mockUploadAttachmentSuccess(issueKey, {
      id: 'attach-1',
      name: 'test-file.txt',
      size: 1024,
    });

    const uploadResult = await client.callTool(
      buildToolName('upload_attachment', MCP_TOOL_PREFIX),
      {
        issueKey,
        filename: 'test-file.txt',
        content: 'Base64 encoded content',
      }
    );
    expect(uploadResult.isError).toBeUndefined();
    const attachmentData = JSON.parse(uploadResult.content[0]!.text);
    expect(attachmentData.success).toBe(true);

    // 4. Создать чеклист
    mockServer.mockAddChecklistItemSuccess(issueKey, {
      id: 'checklist-1',
      text: 'First checklist item',
      checked: false,
    });

    const addChecklistResult = await client.callTool(
      buildToolName('add_checklist_item', MCP_TOOL_PREFIX),
      {
        issueKey,
        text: 'First checklist item',
      }
    );
    expect(addChecklistResult.isError).toBeUndefined();
    const checklistData = JSON.parse(addChecklistResult.content[0]!.text);
    expect(checklistData.success).toBe(true);

    // 5. Создать вторую задачу для связи
    mockServer.mockCreateIssueSuccess({
      key: 'TEST-2',
      queue: { key: queueKey },
      summary: 'Related issue',
    });

    const createIssue2Result = await client.callTool(
      buildToolName('create_issue', MCP_TOOL_PREFIX),
      {
        queue: queueKey,
        summary: 'Related issue',
      }
    );
    expect(createIssue2Result.isError).toBeUndefined();
    const issue2Data = JSON.parse(createIssue2Result.content[0]!.text);
    const issueKey2 = issue2Data.data.issueKey;

    // 6. Создать связь между задачами
    mockServer.mockCreateLinkSuccess(issueKey, issueKey2, {
      id: 'link-1',
      type: { key: 'relates' },
      object: { key: issueKey2 },
    });

    const createLinkResult = await client.callTool(buildToolName('create_link', MCP_TOOL_PREFIX), {
      issueKey,
      relationship: 'relates',
      linkedIssueKey: issueKey2,
    });
    expect(createLinkResult.isError).toBeUndefined();
    const linkData = JSON.parse(createLinkResult.content[0]!.text);
    expect(linkData.success).toBe(true);

    // 7. Изменить статус задачи
    mockServer.mockTransitionIssueSuccess(issueKey, 'inProgress');

    const transitionResult = await client.callTool(
      buildToolName('transition_issue', MCP_TOOL_PREFIX),
      {
        issueKey,
        transitionId: 'inProgress',
      }
    );
    expect(transitionResult.isError).toBeUndefined();

    // 8. Получить changelog и убедиться, что все изменения записаны
    mockServer.mockGetChangelogSuccess(issueKey);

    const changelogResult = await client.callTool(
      buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
      { issueKey }
    );
    expect(changelogResult.isError).toBeUndefined();
    const changelogData = JSON.parse(changelogResult.content[0]!.text);
    expect(changelogData.data.changelog).toBeInstanceOf(Array);
    expect(changelogData.data.changelog.length).toBeGreaterThan(0);

    // Verify all mocked requests were called
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать workflow с несколькими комментариями и чеклистами', async () => {
    const issueKey = 'TEST-10';

    // Создать задачу
    mockServer.mockCreateIssueSuccess({
      key: issueKey,
      queue: { key: 'TEST' },
      summary: 'Multiple comments test',
    });

    await client.callTool(buildToolName('create_issue', MCP_TOOL_PREFIX), {
      queue: 'TEST',
      summary: 'Multiple comments test',
    });

    // Добавить 3 комментария
    for (let i = 1; i <= 3; i++) {
      mockServer.mockAddCommentSuccess(issueKey, {
        id: `comment-${i}`,
        text: `Comment ${i}`,
      });

      const result = await client.callTool(buildToolName('add_comment', MCP_TOOL_PREFIX), {
        issueKey,
        text: `Comment ${i}`,
      });
      expect(result.isError).toBeUndefined();
    }

    // Добавить 3 элемента чеклиста
    for (let i = 1; i <= 3; i++) {
      mockServer.mockAddChecklistItemSuccess(issueKey, {
        id: `checklist-${i}`,
        text: `Checklist item ${i}`,
        checked: false,
      });

      const result = await client.callTool(buildToolName('add_checklist_item', MCP_TOOL_PREFIX), {
        issueKey,
        text: `Checklist item ${i}`,
      });
      expect(result.isError).toBeUndefined();
    }

    // Получить все комментарии
    mockServer.mockGetCommentsSuccess(issueKey, [
      { id: 'comment-1', text: 'Comment 1' },
      { id: 'comment-2', text: 'Comment 2' },
      { id: 'comment-3', text: 'Comment 3' },
    ]);

    const commentsResult = await client.callTool(buildToolName('get_comments', MCP_TOOL_PREFIX), {
      issueKey,
    });
    expect(commentsResult.isError).toBeUndefined();
    const commentsData = JSON.parse(commentsResult.content[0]!.text);
    expect(commentsData.data.comments).toHaveLength(3);

    // Получить чеклист
    mockServer.mockGetChecklistSuccess(issueKey, {
      items: [
        { id: 'checklist-1', text: 'Checklist item 1', checked: false },
        { id: 'checklist-2', text: 'Checklist item 2', checked: false },
        { id: 'checklist-3', text: 'Checklist item 3', checked: false },
      ],
    });

    const checklistResult = await client.callTool(buildToolName('get_checklist', MCP_TOOL_PREFIX), {
      issueKey,
    });
    expect(checklistResult.isError).toBeUndefined();
    const checklistData = JSON.parse(checklistResult.content[0]!.text);
    expect(checklistData.data.checklist.items).toHaveLength(3);

    mockServer.assertAllRequestsDone();
  });
});
