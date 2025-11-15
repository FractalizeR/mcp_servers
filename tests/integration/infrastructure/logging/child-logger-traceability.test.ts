/**
 * Интеграционные тесты для child logger traceability
 *
 * Покрывают:
 * 1. Пробрасывание requestId через цепочку вызовов
 * 2. Child loggers наследуют контекст родителя
 * 3. Множественные child loggers независимы друг от друга
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from '@infrastructure/logging/index.js';
import type { LoggerConfig } from '@infrastructure/logging/index.js';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Child Logger Traceability', () => {
  let testLogsDir: string;

  beforeEach(async () => {
    testLogsDir = await mkdtemp(join(tmpdir(), 'child-logger-test-'));
  });

  afterEach(async () => {
    try {
      await rm(testLogsDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Request Tracing', () => {
    it('должен пробрасывать requestId через child logger', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB - минимальный размер для rotating-file-stream
          maxFiles: 5,
        },
      };

      const rootLogger = new Logger(config);
      const requestId = 'req-12345';

      // Act - создаём child logger с requestId
      const childLogger = rootLogger.child({ requestId });

      childLogger.info('Processing request');
      childLogger.info('Request completed', { duration: 150 });

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await rootLogger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));

      // Проверяем, что requestId есть во всех логах child logger
      const childLogs = logLines.filter((log) => log['requestId'] === requestId);
      expect(childLogs.length).toBe(2);

      expect(childLogs[0]).toHaveProperty('requestId', requestId);
      expect(childLogs[0]).toHaveProperty('msg', 'Processing request');

      expect(childLogs[1]).toHaveProperty('requestId', requestId);
      expect(childLogs[1]).toHaveProperty('msg', 'Request completed');
      expect(childLogs[1]).toHaveProperty('duration', 150);
    });

    it('должен поддерживать вложенные child loggers', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB - минимальный размер для rotating-file-stream
          maxFiles: 5,
        },
      };

      const rootLogger = new Logger(config);

      // Act - создаём цепочку child loggers
      const requestLogger = rootLogger.child({ requestId: 'req-123' });
      const operationLogger = requestLogger.child({ operationId: 'op-456' });

      operationLogger.info('Operation started');
      operationLogger.info('Operation completed');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await rootLogger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));

      const operationLogs = logLines.filter((log) => log['operationId'] === 'op-456');
      expect(operationLogs.length).toBe(2);

      // Проверяем, что оба контекста присутствуют
      operationLogs.forEach((log) => {
        expect(log).toHaveProperty('requestId', 'req-123'); // От родителя
        expect(log).toHaveProperty('operationId', 'op-456'); // От себя
      });
    });

    it('должен изолировать контексты разных child loggers', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB - минимальный размер для rotating-file-stream
          maxFiles: 5,
        },
      };

      const rootLogger = new Logger(config);

      // Act - создаём два независимых child logger
      const request1Logger = rootLogger.child({ requestId: 'req-111' });
      const request2Logger = rootLogger.child({ requestId: 'req-222' });

      request1Logger.info('Request 1 processing');
      request2Logger.info('Request 2 processing');
      request1Logger.info('Request 1 completed');
      request2Logger.info('Request 2 completed');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await rootLogger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));

      const req1Logs = logLines.filter((log) => log['requestId'] === 'req-111');
      const req2Logs = logLines.filter((log) => log['requestId'] === 'req-222');

      // Проверяем изоляцию
      expect(req1Logs.length).toBe(2);
      expect(req2Logs.length).toBe(2);

      req1Logs.forEach((log) => {
        expect(log['requestId']).toBe('req-111');
        expect(log['requestId']).not.toBe('req-222');
      });

      req2Logs.forEach((log) => {
        expect(log['requestId']).toBe('req-222');
        expect(log['requestId']).not.toBe('req-111');
      });
    });
  });

  describe('Tool → Operation Chain Traceability', () => {
    it('должен передавать requestId через имитацию цепочки Tool → Operation', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB - минимальный размер для rotating-file-stream
          maxFiles: 5,
        },
      };

      const rootLogger = new Logger(config);
      const requestId = 'mcp-request-789';

      // Act - имитируем цепочку вызовов
      // 1. ToolRegistry получает запрос от MCP клиента
      const toolRegistryLogger = rootLogger.child({ requestId, component: 'ToolRegistry' });
      toolRegistryLogger.info('Incoming MCP request', {
        toolName: 'fractalizer_mcp_yandex_tracker_get_issues',
      });

      // 2. Tool начинает обработку
      const toolLogger = toolRegistryLogger.child({ component: 'GetIssuesTool' });
      toolLogger.info('Tool execution started');

      // 3. Operation выполняет API запрос
      const operationLogger = toolLogger.child({ component: 'GetIssuesOperation' });
      operationLogger.info('Executing API request');
      operationLogger.info('API request completed', { statusCode: 200 });

      // 4. Tool завершает обработку
      toolLogger.info('Tool execution completed');

      // 5. ToolRegistry возвращает результат
      toolRegistryLogger.info('MCP response sent');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 500));
      await rootLogger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));

      // Все логи должны содержать requestId
      const requestLogs = logLines.filter((log) => log['requestId'] === requestId);
      expect(requestLogs.length).toBe(6);

      // Проверяем правильную последовательность компонентов
      expect(requestLogs[0]).toMatchObject({
        requestId,
        component: 'ToolRegistry',
        msg: 'Incoming MCP request',
      });

      expect(requestLogs[1]).toMatchObject({
        requestId,
        component: 'GetIssuesTool',
        msg: 'Tool execution started',
      });

      expect(requestLogs[2]).toMatchObject({
        requestId,
        component: 'GetIssuesOperation',
        msg: 'Executing API request',
      });

      expect(requestLogs[3]).toMatchObject({
        requestId,
        component: 'GetIssuesOperation',
        msg: 'API request completed',
        statusCode: 200,
      });

      expect(requestLogs[4]).toMatchObject({
        requestId,
        component: 'GetIssuesTool',
        msg: 'Tool execution completed',
      });

      expect(requestLogs[5]).toMatchObject({
        requestId,
        component: 'ToolRegistry',
        msg: 'MCP response sent',
      });
    });
  });

  describe('Error Propagation', () => {
    it('должен сохранять requestId при логировании ошибок', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB - минимальный размер для rotating-file-stream
          maxFiles: 5,
        },
      };

      const rootLogger = new Logger(config);
      const requestId = 'req-error-999';

      // Act
      const childLogger = rootLogger.child({ requestId });

      childLogger.info('Operation started');

      const testError = new Error('Something went wrong');
      childLogger.error('Operation failed', testError, { attemptNumber: 3 });

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await rootLogger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const errorLog = files.find((f) => f.startsWith('error') && f.endsWith('.log'));
      expect(errorLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, errorLog!), 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));

      const errorLogEntry = logLines.find((log) => log['msg'] === 'Operation failed');
      expect(errorLogEntry).toBeDefined();

      // Проверяем наличие requestId в error логе
      expect(errorLogEntry).toHaveProperty('requestId', requestId);
      expect(errorLogEntry).toHaveProperty('attemptNumber', 3);
      expect(errorLogEntry).toHaveProperty('error');
      expect(errorLogEntry['error']).toHaveProperty('message', 'Something went wrong');
    });
  });
});
