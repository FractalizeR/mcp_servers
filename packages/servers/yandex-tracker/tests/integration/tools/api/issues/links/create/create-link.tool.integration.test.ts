// tests/integration/tools/api/issues/links/create/create-link.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';
import {
  createSubtaskLinkFixture,
  createRelatesLinkFixture,
} from '../../../../helpers/link.fixture.js';

describe('create-link integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен создать связь типа "has subtasks"', async () => {
    // Arrange
    const issueKey = 'TEST-100';
    const targetIssue = 'TEST-200';
    const mockLink = createSubtaskLinkFixture({
      id: 'link123',
      object: {
        id: 'issue200',
        key: targetIssue,
        display: 'Target issue',
      },
    });

    mockServer.mockCreateLinkSuccess(issueKey, targetIssue, mockLink);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_link', {
      issueId: issueKey,
      relationship: 'has subtasks',
      targetIssue,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.message).toContain('Связь создана');
    expect(response.link).toHaveProperty('id');
    expect(response.link.type.id).toBe('subtask');
    mockServer.assertAllRequestsDone();
  });

  it('должен создать связь типа "relates"', async () => {
    // Arrange
    const issueKey = 'TEST-300';
    const targetIssue = 'TEST-400';
    const mockLink = createRelatesLinkFixture({
      id: 'link456',
      object: {
        id: 'issue400',
        key: targetIssue,
        display: 'Related issue',
      },
    });

    mockServer.mockCreateLinkSuccess(issueKey, targetIssue, mockLink);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_link', {
      issueId: issueKey,
      relationship: 'relates',
      targetIssue,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.link.type.id).toBe('relates');
    mockServer.assertAllRequestsDone();
  });

  it('должен создать связь типа "depends on"', async () => {
    // Arrange
    const issueKey = 'TEST-500';
    const targetIssue = 'TEST-600';
    const mockLink = createSubtaskLinkFixture({
      id: 'link789',
      type: {
        id: 'depends',
        inward: 'зависит от',
        outward: 'блокирует',
      },
      direction: 'inward',
      object: {
        id: 'issue600',
        key: targetIssue,
        display: 'Blocking issue',
      },
    });

    mockServer.mockCreateLinkSuccess(issueKey, targetIssue, mockLink);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_link', {
      issueId: issueKey,
      relationship: 'depends on',
      targetIssue,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.success).toBe(true);
    expect(response.link.type.id).toBe('depends');
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 404 (задача не найдена)', async () => {
    // Arrange
    const issueKey = 'NONEXISTENT-1';
    mockServer.mockCreateLink404(issueKey);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_link', {
      issueId: issueKey,
      relationship: 'relates',
      targetIssue: 'TEST-100',
    });

    // Assert
    expect(result.isError).toBe(true);
    mockServer.assertAllRequestsDone();
  });

  it('должен включить все поля связи в ответ', async () => {
    // Arrange
    const issueKey = 'TEST-700';
    const targetIssue = 'TEST-800';
    const mockLink = createSubtaskLinkFixture({
      id: 'link999',
      object: {
        id: 'issue800',
        key: targetIssue,
        display: 'Full link data',
      },
    });

    mockServer.mockCreateLinkSuccess(issueKey, targetIssue, mockLink);

    // Act
    const result = await client.callTool('fr_yandex_tracker_create_link', {
      issueId: issueKey,
      relationship: 'has subtasks',
      targetIssue,
    });

    // Assert
    expect(result.isError).toBeUndefined();
    const response = JSON.parse(result.content[0]!.text);
    expect(response.link).toHaveProperty('id');
    expect(response.link).toHaveProperty('type');
    expect(response.link).toHaveProperty('direction');
    expect(response.link).toHaveProperty('linkedIssue');
    expect(response.link).toHaveProperty('createdBy');
    expect(response.link).toHaveProperty('createdAt');
    mockServer.assertAllRequestsDone();
  });
});
