/**
 * Интеграционные тесты для get-issues tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → GetIssuesTool → GetIssuesOperation → HttpClient → API (mock)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('get-issues integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    // Создаём MCP клиент с тестовой конфигурацией
    client = await createTestClient({
      logLevel: 'silent', // Отключаем логи в тестах
    });

    // Создаём mock HTTP сервер
    mockServer = createMockServer();
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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
      });

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        total: 1,
        successful: 1,
        failed: 0,
        fieldsReturned: 'all',
      });

      expect(response.issues).toHaveLength(1);
      expect(response.issues[0].issueKey).toBe(issueKey);

      const issue = response.issues[0].issue;
      expect(issue).toHaveProperty('key', issueKey);
      expect(issue).toHaveProperty('summary');
      expect(issue).toHaveProperty('status');
      expect(issue.status).toHaveProperty('key');
      expect(issue.status).toHaveProperty('display');

      expect(response.errors).toHaveLength(0);

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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        total: 3,
        successful: 3,
        failed: 0,
      });

      expect(response.issues).toHaveLength(3);
      expect(response.errors).toHaveLength(0);

      // Проверяем порядок задач (должен совпадать с issueKeys)
      expect(response.issues[0].issueKey).toBe('QUEUE-1');
      expect(response.issues[1].issueKey).toBe('QUEUE-2');
      expect(response.issues[2].issueKey).toBe('QUEUE-3');

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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.fieldsReturned).toEqual(fields);
      expect(response.issues).toHaveLength(1);

      const issue = response.issues[0].issue;

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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
        fields,
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;
      const issue = response.issues[0].issue;

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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
      });

      // Assert
      expect(result.isError).toBeUndefined(); // Tool не падает, возвращает mixed results

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        total: 1,
        successful: 0,
        failed: 1,
      });

      expect(response.issues).toHaveLength(0);
      expect(response.errors).toHaveLength(1);

      const error = response.errors[0];
      expect(error.key).toBe(issueKey);
      // Просто проверяем, что ошибка есть (Error объект не JSON.stringify-able)
      expect(error.error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 401 (не авторизован)', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      mockServer.mockGetIssue401(issueKey);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.failed).toBe(1);
      expect(response.errors[0].error).toBeDefined();

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 403 (доступ запрещён)', async () => {
      // Arrange
      const issueKey = 'QUEUE-1';
      mockServer.mockGetIssue403(issueKey);

      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [issueKey],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response.failed).toBe(1);
      expect(response.errors[0].error).toBeDefined();

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
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
      });

      // Assert
      expect(result.isError).toBeUndefined();

      const responseWrapper = JSON.parse(result.content[0]!.text);
      const response = responseWrapper.data;

      expect(response).toMatchObject({
        total: 3,
        successful: 2,
        failed: 1,
      });

      expect(response.issues).toHaveLength(2);
      expect(response.errors).toHaveLength(1);

      // Проверяем успешные задачи
      expect(response.issues[0].issueKey).toBe('QUEUE-1');
      expect(response.issues[1].issueKey).toBe('QUEUE-3');

      // Проверяем ошибки
      expect(response.errors[0].key).toBe('QUEUE-2');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Validation', () => {
    it('должен вернуть ошибку при пустом массиве issueKeys', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: [],
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку при невалидном формате ключа', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: ['invalid-key'], // нет дефиса или формат не соответствует QUEUE-123
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });

    it('должен вернуть ошибку если issueKeys не массив', async () => {
      // Act
      const result = await client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
        issueKeys: 'QUEUE-1', // строка вместо массива
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Ошибка валидации параметров');
    });
  });
});
