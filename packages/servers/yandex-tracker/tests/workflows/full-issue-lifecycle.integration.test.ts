// tests/workflows/full-issue-lifecycle.integration.test.ts
/**
 * Интеграционный тест полного lifecycle задачи с использованием всех API
 *
 * Этот тест проверяет комплексный workflow работы с задачей, используя MockServer
 * для эмуляции API Яндекс.Трекер. Тест не требует реальных credentials и подходит
 * для автоматизированного тестирования в CI/CD.
 *
 * Workflow:
 * 1. Создать задачу (Issues)
 * 2. Добавить комментарий (Comments)
 * 3. Прикрепить файл (Attachments)
 * 4. Создать чеклист (Checklists)
 * 5. Создать вторую задачу для связи
 * 6. Создать связь между задачами (Links)
 * 7. Изменить статус (Transitions)
 * 8. Проверить changelog (Changelog)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('Full Issue Lifecycle (Integration)', () => {
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
        fields: ['key', 'summary', 'description'],
      }
    );
    expect(createIssueResult.isError).toBeFalsy();
    const issueData = JSON.parse(createIssueResult.content[0]!.text);
    const issueKey = issueData.data.issueKey;
    expect(issueKey).toBe('TEST-1');

    // 2. Добавить комментарий
    mockServer.mockAddCommentSuccess(issueKey, {
      id: 'comment-1',
      text: 'First comment on this issue',
    });

    const addCommentResult = await client.callTool(buildToolName('add_comment', MCP_TOOL_PREFIX), {
      comments: [
        {
          issueId: issueKey,
          text: 'First comment on this issue',
        },
      ],
      fields: ['id', 'text'],
    });
    expect(addCommentResult.isError).toBeFalsy();
    const commentData = JSON.parse(addCommentResult.content[0]!.text);
    expect(commentData.data.comments).toBeDefined();
    expect(commentData.data.comments[0].comment).toBeDefined();

    // 3. Прикрепить файл
    mockServer.mockUploadAttachmentSuccess(issueKey, {
      id: 'attach-1',
      name: 'test-file.txt',
      size: 1024,
      mimetype: 'text/plain',
      content: 'https://api.tracker.yandex.net/v2/attachments/attach-1/download',
      createdBy: {
        id: 'user-1',
        display: 'Test User',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    const uploadResult = await client.callTool(
      buildToolName('upload_attachment', MCP_TOOL_PREFIX),
      {
        issueId: issueKey,
        filename: 'test-file.txt',
        fileContent: 'Base64 encoded content',
        fields: ['id', 'name', 'size'],
      }
    );
    expect(uploadResult.isError).toBeFalsy();
    const attachmentData = JSON.parse(uploadResult.content[0]!.text);
    expect(attachmentData.success).toBe(true);

    // 4. Создать чеклист (batch API)
    mockServer.mockAddChecklistItemSuccess(issueKey, {
      id: 'checklist-1',
      text: 'First checklist item',
      checked: false,
    });

    const addChecklistResult = await client.callTool(
      buildToolName('add_checklist_item', MCP_TOOL_PREFIX),
      {
        items: [{ issueId: issueKey, text: 'First checklist item' }],
        fields: ['id', 'text', 'checked'],
      }
    );
    expect(addChecklistResult.isError).toBeFalsy();
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
        fields: ['key', 'summary'],
      }
    );
    expect(createIssue2Result.isError).toBeFalsy();
    const issue2Data = JSON.parse(createIssue2Result.content[0]!.text);
    const issueKey2 = issue2Data.data.issueKey;

    // 6. Создать связь между задачами
    mockServer.mockCreateLinkSuccess(issueKey, issueKey2, {
      id: 'link-1',
      type: { key: 'relates' },
      object: { key: issueKey2 },
    });

    const createLinkResult = await client.callTool(buildToolName('create_link', MCP_TOOL_PREFIX), {
      links: [
        {
          issueId: issueKey,
          relationship: 'relates',
          targetIssue: issueKey2,
        },
      ],
      fields: ['id', 'type', 'object'],
    });
    expect(createLinkResult.isError).toBeFalsy();
    const linkData = JSON.parse(createLinkResult.content[0]!.text);
    expect(linkData.success).toBe(true);
    expect(linkData.data.links).toBeDefined();
    expect(linkData.data.links[0].link.id).toBe('link-1');

    // 7. Изменить статус задачи
    mockServer.mockTransitionIssueSuccess(issueKey, 'inProgress');

    const transitionResult = await client.callTool(
      buildToolName('transition_issue', MCP_TOOL_PREFIX),
      {
        issueKey: issueKey,
        transitionId: 'inProgress',
        fields: ['key', 'status'],
      }
    );
    expect(transitionResult.isError).toBeFalsy();

    // 8. Получить changelog и убедиться, что все изменения записаны
    mockServer.mockGetChangelogSuccess(issueKey);

    const changelogResult = await client.callTool(
      buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
      {
        issueKeys: [issueKey],
        fields: ['id', 'updatedAt', 'updatedBy'],
      }
    );
    expect(changelogResult.isError).toBeFalsy();
    const changelogData = JSON.parse(changelogResult.content[0]!.text);
    expect(changelogData.data.successful).toHaveLength(1);
    expect(changelogData.data.successful[0].changelog).toBeInstanceOf(Array);
    expect(changelogData.data.successful[0].changelog.length).toBeGreaterThan(0);

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
      fields: ['key'],
    });

    // Добавить 3 комментария
    for (let i = 1; i <= 3; i++) {
      mockServer.mockAddCommentSuccess(issueKey, {
        id: `comment-${i}`,
        text: `Comment ${i}`,
      });

      const result = await client.callTool(buildToolName('add_comment', MCP_TOOL_PREFIX), {
        comments: [
          {
            issueId: issueKey,
            text: `Comment ${i}`,
          },
        ],
        fields: ['id', 'text'],
      });
      expect(result.isError).toBeFalsy();
    }

    // Добавить 3 элемента чеклиста
    for (let i = 1; i <= 3; i++) {
      mockServer.mockAddChecklistItemSuccess(issueKey, {
        id: `checklist-${i}`,
        text: `Checklist item ${i}`,
        checked: false,
      });

      const result = await client.callTool(buildToolName('add_checklist_item', MCP_TOOL_PREFIX), {
        items: [{ issueId: issueKey, text: `Checklist item ${i}` }],
        fields: ['id', 'text', 'checked'],
      });
      expect(result.isError).toBeFalsy();
    }

    // Получить все комментарии
    mockServer.mockGetCommentsSuccess(issueKey, [
      { id: 'comment-1', text: 'Comment 1' },
      { id: 'comment-2', text: 'Comment 2' },
      { id: 'comment-3', text: 'Comment 3' },
    ]);

    const commentsResult = await client.callTool(buildToolName('get_comments', MCP_TOOL_PREFIX), {
      issueIds: [issueKey],
      fields: ['id', 'text'],
    });
    expect(commentsResult.isError).toBeFalsy();
    const commentsData = JSON.parse(commentsResult.content[0]!.text);
    expect(commentsData.data.comments).toHaveLength(1);
    expect(commentsData.data.comments[0].count).toBe(3);

    // Получить чеклист (batch API)
    mockServer.mockGetChecklistSuccess(issueKey, [
      { id: 'checklist-1', text: 'Checklist item 1', checked: false },
      { id: 'checklist-2', text: 'Checklist item 2', checked: false },
      { id: 'checklist-3', text: 'Checklist item 3', checked: false },
    ]);

    const checklistResult = await client.callTool(buildToolName('get_checklist', MCP_TOOL_PREFIX), {
      issueIds: [issueKey],
      fields: ['id', 'text', 'checked'],
    });
    expect(checklistResult.isError).toBeFalsy();
    const checklistData = JSON.parse(checklistResult.content[0]!.text);
    expect(checklistData.data.successful[0].checklist).toHaveLength(3);

    mockServer.assertAllRequestsDone();
  });
});
