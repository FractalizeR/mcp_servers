// tests/integration/mcp/tools/api/issues/transitions/get-issue-transitions.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-issue-transitions integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить доступные transitions', async () => {
    // Arrange
    const issueKey = 'TEST-400';
    mockServer.mockGetTransitionsSuccess(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_transitions', {
      issueKey,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data).toHaveProperty('transitions');
    expect(Array.isArray(response.data.transitions)).toBe(true);
    expect(response.data.transitions.length).toBeGreaterThan(0);

    const transition = response.data.transitions[0];
    expect(transition).toHaveProperty('id');
    expect(transition).toHaveProperty('to');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockGetTransitions404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_transitions', {
      issueKey,
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить transitions с фильтрацией полей', async () => {
    // Arrange
    const issueKey = 'TEST-401';
    mockServer.mockGetTransitionsSuccess(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_transitions', {
      issueKey,
      fields: ['id', 'to'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.transitions).toBeDefined();
    mockServer.assertAllRequestsDone();
  });
});
