// tests/e2e/workflows/issue-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { WorkflowClient } from '../helpers/workflow-client.js';
import { assertIssueStructure, assertIssueStatus } from '../helpers/assertion-helpers.js';

describe('Issue Lifecycle E2E', () => {
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

  it('должен выполнить полный цикл: создать → обновить → перевести', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'E2E Test Issue',
      description: 'Testing full lifecycle',
    };

    // Act 1: Создание
    mockServer.e2e_createIssueSuccess({ key: 'TEST-123', ...issueData });
    const issueKey = await workflow.createIssue(issueData);

    expect(issueKey).toBe('TEST-123');

    // Act 2: Обновление
    mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated Summary' });
    await workflow.updateIssue(issueKey, { summary: 'Updated Summary' });

    // Act 3: Переход
    mockServer.e2e_transitionIssueSuccess(issueKey, 'inProgress');
    await workflow.transitionIssue(issueKey, 'inProgress');

    // Act 4: Получение финального состояния
    mockServer.mockGetIssueSuccess(issueKey, {
      summary: 'Updated Summary',
      status: { key: 'inProgress' },
    });
    const finalIssue = await workflow.getIssue(issueKey);

    // Assert
    assertIssueStructure(finalIssue);
    assertIssueStatus(finalIssue, 'inProgress');
    mockServer.assertAllRequestsDone();
  });

  it('должен создать задачу с минимальными полями', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'Minimal Issue',
    };

    // Act
    mockServer.e2e_createIssueSuccess({ key: 'TEST-124', ...issueData });
    const issueKey = await workflow.createIssue(issueData);

    // Assert
    expect(issueKey).toBe('TEST-124');
    mockServer.assertAllRequestsDone();
  });

  it('должен обновить несколько полей задачи', async () => {
    // Arrange
    const issueKey = 'TEST-125';
    const updates = {
      summary: 'New Summary',
      description: 'New Description',
      priority: 'critical',
    };

    // Act
    mockServer.e2e_updateIssueSuccess(issueKey, updates);
    await workflow.updateIssue(issueKey, updates);

    // Assert
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить несколько переходов последовательно', async () => {
    // Arrange
    const issueKey = 'TEST-126';

    // Act 1: Переход в In Progress
    mockServer.e2e_transitionIssueSuccess(issueKey, 'start');
    await workflow.transitionIssue(issueKey, 'start');

    // Act 2: Переход в Closed
    mockServer.e2e_transitionIssueSuccess(issueKey, 'close');
    await workflow.transitionIssue(issueKey, 'close');

    // Assert
    mockServer.assertAllRequestsDone();
  });
});
