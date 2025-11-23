// tests/integration/tools/api/issues/links/get/get-issue-links.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import {
  createLinkListFixture,
  createSubtaskLinkFixture,
  createRelatesLinkFixture,
} from '#helpers/link.fixture.js';

describe('get-issue-links integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен получить список связей задачи (batch)', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const mockLinks = createLinkListFixture(3);
    mockServer.mockGetLinksSuccess(issueKey, mockLinks);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.total).toBe(1);
    expect(response.data.successful).toHaveLength(1);
    expect(response.data.successful[0].issueId).toBe(issueKey);
    expect(response.data.successful[0].links).toHaveLength(3);
    expect(response.data.successful[0].count).toBe(3);
    mockServer.assertAllRequestsDone();
  });

  it('должен вернуть пустой массив когда нет связей', async () => {
    // Arrange
    const issueKey = 'TEST-200';
    mockServer.mockGetLinksSuccess(issueKey, []);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.successful[0].count).toBe(0);
    expect(response.data.successful[0].links).toEqual([]);
    mockServer.assertAllRequestsDone();
  });

  it('должен получить связи разных типов', async () => {
    // Arrange
    const issueKey = 'TEST-300';
    const mockLinks = [
      createSubtaskLinkFixture({ id: 'link1' }),
      createRelatesLinkFixture({ id: 'link2' }),
    ];
    mockServer.mockGetLinksSuccess(issueKey, mockLinks);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.successful[0].links).toHaveLength(2);
    expect(response.data.successful[0].links[0].type.id).toBe('subtask');
    expect(response.data.successful[0].links[1].type.id).toBe('relates');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockGetLinks404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.failed).toHaveLength(1);
    expect(response.data.failed[0].issueId).toBe(issueKey);
    mockServer.assertAllRequestsDone();
  });

  it('должен включить все поля связи в ответ', async () => {
    // Arrange
    const issueKey = 'TEST-400';
    const mockLinks = [createSubtaskLinkFixture()];
    mockServer.mockGetLinksSuccess(issueKey, mockLinks);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    const link = response.data.successful[0].links[0];
    expect(link).toHaveProperty('id');
    expect(link).toHaveProperty('type');
    expect(link).toHaveProperty('object');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать большое количество связей', async () => {
    // Arrange
    const issueKey = 'TEST-999'; // Валидный формат: буквы-цифры
    const mockLinks = createLinkListFixture(50);
    mockServer.mockGetLinksSuccess(issueKey, mockLinks);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'type', 'object'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.data.successful[0].count).toBe(50);
    expect(response.data.successful[0].links).toHaveLength(50);
    mockServer.assertAllRequestsDone();
  });

  it('должен включить updatedBy и updatedAt если они есть', async () => {
    // Arrange
    const issueKey = 'TEST-500';
    const mockLinks = [
      createSubtaskLinkFixture({
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v3/users/123',
          id: '123',
          display: 'Updater',
        },
        updatedAt: '2025-01-19T12:00:00.000+0000',
      }),
    ];
    mockServer.mockGetLinksSuccess(issueKey, mockLinks);

    // Act
    const result = await client.callTool('fr_yandex_tracker_get_issue_links', {
      issueIds: [issueKey],
      fields: ['id', 'updatedBy', 'updatedAt'],
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    const link = response.data.successful[0].links[0];
    expect(link).toHaveProperty('updatedBy');
    expect(link).toHaveProperty('updatedAt');
    expect(link.updatedBy.id).toBe('123');
    mockServer.assertAllRequestsDone();
  });
});
