// tests/integration/mcp/tools/api/issues/transition/transition-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('transition-issue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен выполнить переход задачи', async () => {
    // Arrange
    const issueKey = 'TEST-200';
    const transitionId = 'start';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue.key).toBe(issueKey);
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить переход с комментарием', async () => {
    // Arrange
    const issueKey = 'TEST-201';
    const transitionId = 'close';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      comment: 'Closing as completed',
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача или переход не найдены)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    const transitionId = 'start';
    mockServer.mockTransitionIssue404(issueKey, transitionId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      fields: STANDARD_ISSUE_FIELDS,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить переход с фильтрацией полей', async () => {
    // Arrange
    const issueKey = 'TEST-202';
    const transitionId = 'resolve';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    // Act
    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      fields: ['key', 'status'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue).toHaveProperty('key');
    mockServer.assertAllRequestsDone();
  });

  it('регрессия: запрошенные поля реально присутствуют в ответе (issue больше не {})', async () => {
    // Ответ POST `_execute` — список переходов (id/self/to/screen), а НЕ задача
    // (см. TransitionIssueOperation). Если бы проекция `fields` применялась
    // к этому ответу как раньше, "key"/"status.display" отсутствовали бы в
    // исходных данных и `issue` пришёл бы пустым объектом `{}`.
    const issueKey = 'TEST-203';
    const transitionId = 'start';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId, {
      status: { key: 'inProgress', display: 'In Progress' },
    });

    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      fields: ['key', 'status.display'],
    });

    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue).not.toEqual({});
    expect(response.data.issue.key).toBe(issueKey);
    expect(response.data.issue.status?.display).toBe('In Progress');
    mockServer.assertAllRequestsDone();
  });

  it('пустой объект для заведомо несуществующего поля — ожидаемое поведение фильтра, не баг перехода', async () => {
    // Отличаем от регрессии выше: если ВСЕ запрошенные поля отсутствуют у
    // задачи (опечатка/несуществующее поле), ResponseFieldFilter законно
    // вернёт {} — это поведение фильтрации, а не поломанный переход.
    const issueKey = 'TEST-204';
    const transitionId = 'start';
    mockServer.mockTransitionIssueSuccess(issueKey, transitionId);

    const result = await client.callTool('fr_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
      fields: ['noSuchField'],
    });

    expect(result.isError).toBeUndefined();
    const response = JSON.parse(getTextContent(result));
    expect(response.data.issue).toEqual({});
    mockServer.assertAllRequestsDone();
  });
});
