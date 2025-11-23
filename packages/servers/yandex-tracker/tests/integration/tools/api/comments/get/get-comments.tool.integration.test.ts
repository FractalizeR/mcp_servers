// tests/integration/tools/api/comments/get/get-comments.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';

describe('get-comments integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить список комментариев задачи', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    mockServer.mockGetCommentsSuccess(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_comments', {
      issueIds: [issueKey],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(1);
    expect(response.data.successful).toBe(1);
    expect(response.data.comments).toBeDefined();
    expect(Array.isArray(response.data.comments)).toBe(true);
    expect(response.data.comments.length).toBe(1);
    expect(response.data.comments[0].issueId).toBe(issueKey);
    expect(response.data.comments[0].count).toBeGreaterThan(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить пустой список комментариев', async () => {
    // Arrange
    const issueKey = 'TEST-101';
    mockServer.mockGetCommentsEmpty(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_comments', {
      issueIds: [issueKey],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(1);
    expect(response.data.successful).toBe(1);
    expect(response.data.comments).toBeDefined();
    expect(Array.isArray(response.data.comments)).toBe(true);
    expect(response.data.comments.length).toBe(1);
    expect(response.data.comments[0].count).toBe(0);
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockGetComments404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_comments', {
      issueIds: [issueKey],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(1);
    expect(response.data.failed).toBe(1);
    expect(response.data.errors).toBeDefined();
    expect(response.data.errors.length).toBe(1);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить комментарии с пагинацией', async () => {
    // Arrange
    const issueKey = 'TEST-102';
    mockServer.mockGetCommentsSuccess(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_comments', {
      issueIds: [issueKey],
      perPage: 10,
      page: 1,
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(1);
    expect(response.data.comments).toBeDefined();
    expect(Array.isArray(response.data.comments)).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить комментарии с expand параметром', async () => {
    // Arrange
    const issueKey = 'TEST-103';
    mockServer.mockGetCommentsSuccess(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_comments', {
      issueIds: [issueKey],
      expand: ['attachments'],
      fields: ['id', 'text'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.data.total).toBe(1);
    expect(response.data.comments).toBeDefined();
    expect(Array.isArray(response.data.comments)).toBe(true);
    mockServer.assertAllRequestsDone();
  });
});
