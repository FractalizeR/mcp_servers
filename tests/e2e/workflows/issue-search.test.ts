// tests/e2e/workflows/issue-search.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import { WorkflowClient } from '../helpers/workflow-client.js';
import { assertIssuesContainKeys, assertIssueStructure } from '../helpers/assertion-helpers.js';

describe('Issue Search E2E', () => {
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

  it('должен найти задачи по query', async () => {
    // Arrange
    const query = 'queue: TEST AND status: open';
    const expectedKeys = ['TEST-1', 'TEST-2', 'TEST-3'];

    // Act
    mockServer.mockFindIssuesSuccess(expectedKeys);
    const issues = await workflow.findIssues(query);

    // Assert
    expect(issues).toHaveLength(expectedKeys.length);
    assertIssuesContainKeys(issues, expectedKeys);
    mockServer.assertAllRequestsDone();
  });

  it('должен вернуть пустой массив если задачи не найдены', async () => {
    // Arrange
    const query = 'queue: NONEXISTENT';

    // Act
    mockServer.mockFindIssuesEmpty();
    const issues = await workflow.findIssues(query);

    // Assert
    expect(issues).toHaveLength(0);
    expect(Array.isArray(issues)).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен найти задачи с конкретными фильтрами', async () => {
    // Arrange
    const query = 'assignee: me() AND priority: critical';
    const expectedKeys = ['TEST-10', 'TEST-20'];

    // Act
    mockServer.mockFindIssuesSuccess(expectedKeys);
    const issues = await workflow.findIssues(query);

    // Assert
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      assertIssueStructure(issue);
    }
    mockServer.assertAllRequestsDone();
  });

  it('должен выполнить workflow: создать → найти → обновить', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'Searchable Issue',
    };

    // Act 1: Создать задачу
    mockServer.e2e_createIssueSuccess({ key: 'TEST-100', ...issueData });
    const issueKey = await workflow.createIssue(issueData);

    // Act 2: Найти созданную задачу
    mockServer.mockFindIssuesSuccess([issueKey]);
    const foundIssues = await workflow.findIssues(`key: ${issueKey}`);

    // Act 3: Обновить найденную задачу
    mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated' });
    await workflow.updateIssue(issueKey, { summary: 'Updated' });

    // Assert
    expect(foundIssues).toHaveLength(1);
    assertIssuesContainKeys(foundIssues, [issueKey]);
    mockServer.assertAllRequestsDone();
  });
});
