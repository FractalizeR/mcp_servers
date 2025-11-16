/**
 * Интеграционные тесты для find-issues tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → FindIssuesTool → FindIssuesOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('find-issues integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    // ВАЖНО: создаём MCP клиент СНАЧАЛА, чтобы получить axios instance
    client = await createTestClient({
      logLevel: 'silent', // Отключаем логи в тестах
    });

    // Затем создаём MockServer с axios instance из клиента
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    // Очищаем моки после каждого теста
    mockServer.cleanup();
  });

  describe('Happy Path', () => {
    it('должен успешно найти задачи по ключам (keys)', async () => {
      // Arrange
      const issueKeys = ['QUEUE-1', 'QUEUE-2'];
      mockServer.mockFindIssuesSuccess(issueKeys, (body) => {
        const keys = body['keys'] as string[] | undefined;
        return keys !== undefined && issueKeys.every((key) => keys.includes(key));
      });

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        keys: issueKeys,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(2);
      expect(response.issues).toHaveLength(2);
      expect(response.fieldsReturned).toBe('all');
      expect(response.searchCriteria).toMatchObject({
        hasQuery: false,
        hasFilter: false,
        keysCount: 2,
        hasQueue: false,
        perPage: 50,
      });

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно найти задачи по query (JQL)', async () => {
      // Arrange
      const query = 'Author: me() Resolution: empty()';
      const issueKeys = ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'];

      mockServer.mockFindIssuesSuccess(issueKeys, (body) => {
        return body['query'] === query;
      });

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(3);
      expect(response.issues).toHaveLength(3);
      expect(response.searchCriteria.hasQuery).toBe(true);

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно найти задачи по очереди (queue)', async () => {
      // Arrange
      const queue = 'TESTQUEUE';
      const issueKeys = ['TESTQUEUE-1', 'TESTQUEUE-2'];

      mockServer.mockFindIssuesSuccess(issueKeys, (body) => {
        return body['queue'] === queue;
      });

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        queue,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(2);
      expect(response.searchCriteria.hasQueue).toBe(true);

      mockServer.assertAllRequestsDone();
    });

    it('должен успешно найти задачи по фильтру (filter)', async () => {
      // Arrange
      const filter = { status: 'open', priority: 'critical' };
      const issueKeys = ['QUEUE-1'];

      mockServer.mockFindIssuesSuccess(issueKeys, (body) => {
        const bodyFilter = body['filter'] as Record<string, string> | undefined;
        return (
          bodyFilter !== undefined &&
          bodyFilter['status'] === 'open' &&
          bodyFilter['priority'] === 'critical'
        );
      });

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        filter,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(1);
      expect(response.searchCriteria.hasFilter).toBe(true);

      mockServer.assertAllRequestsDone();
    });

    it.skip('должен поддерживать пагинацию (perPage, page)', async () => {
      // Arrange
      const issueKeys = ['QUEUE-1', 'QUEUE-2'];

      mockServer.mockFindIssuesSuccess(issueKeys);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'Author: me()',
        perPage: 2,
        page: 1,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(2);
      expect(response.searchCriteria.perPage).toBe(2);

      mockServer.assertAllRequestsDone();
    });

    it('должен поддерживать сортировку (order)', async () => {
      // Arrange
      const order = ['+created', '-priority'];
      const issueKeys = ['QUEUE-1', 'QUEUE-2'];

      mockServer.mockFindIssuesSuccess(issueKeys, (body) => {
        const bodyOrder = body['order'] as string[] | undefined;
        return bodyOrder !== undefined && bodyOrder.length === 2 && bodyOrder[0] === '+created';
      });

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'Author: me()',
        order,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(2);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Fields Filtering', () => {
    it('должен вернуть только указанные поля', async () => {
      // Arrange
      const issueKeys = ['QUEUE-1'];
      const fields = ['key', 'summary', 'status'];

      mockServer.mockFindIssuesSuccess(issueKeys);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        keys: issueKeys,
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.fieldsReturned).toEqual(fields);
      expect(response.issues).toHaveLength(1);

      const issue = response.issues[0];

      // Должны быть только запрошенные поля
      expect(issue).toHaveProperty('key');
      expect(issue).toHaveProperty('summary');
      expect(issue).toHaveProperty('status');

      // НЕ должно быть других полей
      expect(issue).not.toHaveProperty('createdAt');
      expect(issue).not.toHaveProperty('updatedAt');
      expect(issue).not.toHaveProperty('assignee');

      mockServer.assertAllRequestsDone();
    });

    it('должен поддерживать вложенные поля', async () => {
      // Arrange
      const issueKeys = ['QUEUE-1'];
      const fields = ['key', 'status.key', 'status.display'];

      mockServer.mockFindIssuesSuccess(issueKeys);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        keys: issueKeys,
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;
      const issue = response.issues[0];

      expect(issue).toHaveProperty('key');
      expect(issue).toHaveProperty('status');
      expect(issue.status).toHaveProperty('key');
      expect(issue.status).toHaveProperty('display');

      // НЕ должно быть других полей в status
      expect(issue.status).not.toHaveProperty('self');
      expect(issue.status).not.toHaveProperty('id');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Error Handling', () => {
    it('должен обработать ошибку 400 (невалидный запрос)', async () => {
      // Arrange
      mockServer.mockFindIssuesError400();

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'invalid JQL syntax',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка при поиске задач');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Empty Results', () => {
    it('должен корректно обработать пустой результат поиска', async () => {
      // Arrange
      mockServer.mockFindIssuesEmpty();

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'nonexistent task',
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.count).toBe(0);
      expect(response.issues).toHaveLength(0);

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку если не указан ни один параметр поиска', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {});

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
      expect(result.content[0]!.text).toContain(
        'хотя бы один способ поиска: query, filter, keys, queue или filterId'
      );
    });

    it('должен вернуть ошибку для невалидного perPage (отрицательное число)', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'test',
        perPage: -1,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку для невалидного page (не целое число)', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'test',
        page: 1.5,
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it.skip('должен принять валидные параметры', async () => {
      // Arrange
      mockServer.mockFindIssuesSuccess(['QUEUE-1']);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
        query: 'Author: me()',
        perPage: 10,
        page: 1,
        fields: ['key', 'summary'],
      });

      // Assert
      expect(result.isError).toBeUndefined();
      mockServer.assertAllRequestsDone();
    });
  });
});
