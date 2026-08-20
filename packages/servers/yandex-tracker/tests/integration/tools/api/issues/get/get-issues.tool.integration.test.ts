/**
 * Интеграционные тесты для get-issues tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetIssuesTool → GetIssuesOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import type { MockServer } from '#integration/helpers/mock-server.js';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('get-issues integration tests', () => {
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
    it('должен успешно получить одну задачу по ключу', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      mockServer.mockGetIssueSuccess(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(1);
      expect(response.failed).toHaveLength(0);

      expect(response.successful[0].issueId).toBe(issueKey);

      const issue = response.successful[0].issue;
      expect(issue).toHaveProperty('key', issueKey);
      expect(issue).toHaveProperty('summary');
      expect(issue).toHaveProperty('status');
      expect(issue.status).toHaveProperty('key');
      expect(issue.status).toHaveProperty('display');

      // Проверяем, что все замоканные запросы были выполнены
      mockServer.assertAllRequestsDone();
    });

    it('должен успешно получить несколько задач (batch)', async () => {
      // Arrange
      const issueKeys = ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'];

      // Мокаем каждую задачу отдельно
      issueKeys.forEach((key) => {
        mockServer.mockGetIssueSuccess(key);
      });

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: issueKeys,
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(3);
      expect(response.successful).toHaveLength(3);
      expect(response.failed).toHaveLength(0);

      // Проверяем порядок задач (должен совпадать с issueKeys)
      expect(response.successful[0].issueId).toBe('QUEUE-1');
      expect(response.successful[1].issueId).toBe('QUEUE-2');
      expect(response.successful[2].issueId).toBe('QUEUE-3');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Fields Filtering', () => {
    it('должен вернуть только указанные поля', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      const fields = ['key', 'summary', 'status'];

      mockServer.mockGetIssueSuccess(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.successful).toHaveLength(1);

      const issue = response.successful[0].issue;

      // Должны быть только запрошенные поля
      expect(issue).toHaveProperty('key');
      expect(issue).toHaveProperty('summary');
      expect(issue).toHaveProperty('status');

      // НЕ должно быть других полей
      expect(issue).not.toHaveProperty('createdAt');
      expect(issue).not.toHaveProperty('updatedAt');
      expect(issue).not.toHaveProperty('assignee');
      expect(issue).not.toHaveProperty('priority');

      mockServer.assertAllRequestsDone();
    });

    it('должен поддерживать вложенные поля', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      const fields = ['key', 'status.key', 'status.display'];

      mockServer.mockGetIssueSuccess(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;
      const issue = response.successful[0].issue;

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

  describe('Error Handling: HTTP Errors', () => {
    it('должен обработать ошибку 404 (задача не найдена)', async () => {
      // Arrange
      const issueKey = 'NONEXISTENT-1';
      mockServer.mockGetIssue404(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined(); // Tool не падает, возвращает mixed results

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(1);
      expect(response.successful).toHaveLength(0);
      expect(response.failed).toHaveLength(1);

      const error = response.failed[0];
      expect(error.issueId).toBe(issueKey);
      // Просто проверяем, что ошибка есть (Error объект не JSON.stringify-able)
      expect(error.error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 401 (не авторизован)', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      mockServer.mockGetIssue401(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 403 (доступ запрещён)', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      mockServer.mockGetIssue403(issueKey);

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [issueKey],
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.failed).toHaveLength(1);
      expect(response.failed[0].error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });
  });

  // NOTE: Network error тесты (ETIMEDOUT, ECONNREFUSED) не включены,
  // так как nock не может эмулировать настоящие сетевые ошибки.
  // Для тестирования network errors требуется мок на уровне axios.

  describe('Mixed Results (partial success)', () => {
    it('должен корректно обработать смешанные результаты (успех + ошибки)', async () => {
      // Arrange
      mockServer.mockGetIssueSuccess('QUEUE-1');
      mockServer.mockGetIssue404('QUEUE-2');
      mockServer.mockGetIssueSuccess('QUEUE-3');

      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
        fields: STANDARD_ISSUE_FIELDS,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(getTextContent(result));
      const response = responseWrapper.data;

      expect(response.total).toBe(3);
      expect(response.successful).toHaveLength(2);
      expect(response.failed).toHaveLength(1);

      // Проверяем успешные задачи
      expect(response.successful[0].issueId).toBe('QUEUE-1');
      expect(response.successful[1].issueId).toBe('QUEUE-3');

      // Проверяем ошибки
      expect(response.failed[0].issueId).toBe('QUEUE-2');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве issueIds', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: [],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при невалидном формате ключа', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: ['invalid-key'], // не ключ QUEUE-123 и не 24-символьный hex id
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку если issueIds не массив', async () => {
      // Act
      const result = await client.callTool('fr_yandex_tracker_get_issues', {
        issueIds: 'QUEUE-1', // строка вместо массива
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('Ошибка валидации параметров');
    });
  });
});
