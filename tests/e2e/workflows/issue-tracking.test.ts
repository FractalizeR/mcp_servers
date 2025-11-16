// tests/e2e/workflows/issue-tracking.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { WorkflowClient } from '../helpers/workflow-client.js';
import {
  assertChangelogStructure,
  assertTransitionsStructure,
} from '../helpers/assertion-helpers.js';

describe('Issue Tracking E2E', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;
  let workflow: WorkflowClient;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
    workflow = new WorkflowClient(client);
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить changelog задачи', async () => {
    // Arrange
    const issueKey = 'TEST-200';

    // Act
    mockServer.e2e_getChangelogSuccess(issueKey);
    const changelog = await workflow.getChangelog(issueKey);

    // Assert
    assertChangelogStructure(changelog);
    expect(changelog.length).toBeGreaterThan(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить доступные transitions', async () => {
    // Arrange
    const issueKey = 'TEST-201';

    // Act
    mockServer.e2e_getTransitionsSuccess(issueKey);
    const transitions = await workflow.getTransitions(issueKey);

    // Assert
    assertTransitionsStructure(transitions);
    expect(transitions.length).toBeGreaterThan(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить workflow: создать → получить transitions → перевести → получить changelog', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'Tracked Issue',
    };

    // Act 1: Создать задачу
    mockServer.e2e_createIssueSuccess({ key: 'TEST-202', ...issueData });
    const issueKey = await workflow.createIssue(issueData);

    // Act 2: Получить доступные transitions
    const availableTransitions = [
      { id: 'start', to: { key: 'inProgress' } },
      { id: 'close', to: { key: 'closed' } },
    ];
    mockServer.e2e_getTransitionsSuccess(issueKey, availableTransitions);
    const transitions = await workflow.getTransitions(issueKey);

    // Act 3: Выполнить переход
    mockServer.e2e_transitionIssueSuccess(issueKey, 'start');
    await workflow.transitionIssue(issueKey, 'start');

    // Act 4: Получить changelog
    mockServer.e2e_getChangelogSuccess(issueKey);
    const changelog = await workflow.getChangelog(issueKey);

    // Assert
    expect(transitions).toHaveLength(2);
    assertTransitionsStructure(transitions);
    assertChangelogStructure(changelog);
    mockServer.assertAllRequestsDone();
  });

  it('должен проверить transitions перед переходом', async () => {
    // Arrange
    const issueKey = 'TEST-203';
    const availableTransitions = [
      { id: 'start', to: { key: 'inProgress' } },
      { id: 'resolve', to: { key: 'resolved' } },
    ];

    // Act: Получить transitions
    mockServer.e2e_getTransitionsSuccess(issueKey, availableTransitions);
    const transitions = await workflow.getTransitions(issueKey);

    // Assert: Проверить что transition доступен
    const transitionIds = (transitions as { id: string }[]).map((t) => t.id);
    expect(transitionIds).toContain('start');
    expect(transitionIds).toContain('resolve');

    // Act: Выполнить валидный переход
    mockServer.e2e_transitionIssueSuccess(issueKey, 'start');
    await workflow.transitionIssue(issueKey, 'start');

    mockServer.assertAllRequestsDone();
  });

  it('должен отслеживать историю изменений после нескольких операций', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'Change Tracking',
    };

    // Act 1: Создать
    mockServer.e2e_createIssueSuccess({ key: 'TEST-204', ...issueData });
    const issueKey = await workflow.createIssue(issueData);

    // Act 2: Обновить
    mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated 1' });
    await workflow.updateIssue(issueKey, { summary: 'Updated 1' });

    // Act 3: Еще раз обновить
    mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated 2' });
    await workflow.updateIssue(issueKey, { summary: 'Updated 2' });

    // Act 4: Получить changelog
    mockServer.e2e_getChangelogSuccess(issueKey);
    const changelog = await workflow.getChangelog(issueKey);

    // Assert
    assertChangelogStructure(changelog);
    expect(Array.isArray(changelog)).toBe(true);
    mockServer.assertAllRequestsDone();
  });
});
