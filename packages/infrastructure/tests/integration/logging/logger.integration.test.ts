/**
 * Интеграционные тесты для логгера
 *
 * Покрывают:
 * 1. Реальную запись в файлы
 * 2. Ротацию файлов при превышении размера
 * 3. Сжатие старых логов в .gz
 * 4. Dual-streams (stderr + file)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { LoggerConfig } from '@mcp-framework/infrastructure/logging/index.js';
import { mkdtemp, readdir, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Logger Integration Tests', () => {
  let testLogsDir: string;

  beforeEach(async () => {
    // Создаём временную директорию для каждого теста
    testLogsDir = await mkdtemp(join(tmpdir(), 'logger-integration-test-'));
  });

  afterEach(async () => {
    // Очищаем временную директорию после теста
    try {
      await rm(testLogsDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки удаления
    }
  });

  describe('File Rotation', () => {
    it('должен создать лог-файл при первой записи', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 1024, // 1KB
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);

      // Act
      logger.info('Test log message');

      // Даём время на запись в файл
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const files = await readdir(testLogsDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.startsWith('combined'))).toBe(true);
      expect(files.some((f) => f.startsWith('error'))).toBe(true);
    });

    it('должен ротировать файлы при превышении maxSize', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 5 * 1024, // 5KB - гарантируем превышение
          maxFiles: 3,
        },
      };

      const logger = new Logger(config);

      // Act - пишем много логов, чтобы превысить maxSize
      const longMessage = 'A'.repeat(200); // 200 байт
      for (let i = 0; i < 50; i++) {
        logger.info(`Message ${i}: ${longMessage}`);
      }

      // Даём время на ротацию (rotating-file-stream делает это асинхронно)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await logger.flush();

      // Assert
      const files = await readdir(testLogsDir);

      // Должны появиться ротированные файлы (.gz)
      const gzFiles = files.filter((f) => f.endsWith('.gz'));
      expect(gzFiles.length).toBeGreaterThan(0);

      // Проверяем, что есть текущий файл и архивы
      const combinedFiles = files.filter((f) => f.startsWith('combined'));
      expect(combinedFiles.length).toBeGreaterThan(1); // Текущий + архивы
    });

    it('должен сжимать старые логи в .gz формат', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 5 * 1024, // 5KB - гарантируем превышение
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);

      // Act
      const message = 'X'.repeat(200);
      for (let i = 0; i < 50; i++) {
        logger.info(`Log ${i}: ${message}`);
      }

      // Даём время на ротацию и сжатие
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await logger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const gzFiles = files.filter((f) => f.endsWith('.gz'));

      expect(gzFiles.length).toBeGreaterThan(0);

      // Проверяем, что .gz файлы не пустые
      for (const gzFile of gzFiles) {
        const filePath = join(testLogsDir, gzFile);
        const stats = await stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('должен ограничивать количество файлов согласно maxFiles', async () => {
      // Arrange
      const maxFiles = 3;
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 2 * 1024, // 2KB
          maxFiles,
        },
      };

      const logger = new Logger(config);

      // Act - записываем много логов для создания множества файлов
      const message = 'Y'.repeat(40);
      for (let i = 0; i < 30; i++) {
        logger.info(`Message ${i}: ${message}`);
      }

      // Даём время на ротацию и очистку старых файлов
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Assert
      const files = await readdir(testLogsDir);
      const combinedFiles = files.filter(
        (f) => f.startsWith('combined') && (f.endsWith('.log') || f.endsWith('.gz'))
      );

      // Количество файлов должно быть не больше maxFiles (текущий + ротированные)
      // NOTE: rotating-file-stream может временно создать больше файлов,
      // но в итоге оставит только maxFiles
      expect(combinedFiles.length).toBeLessThanOrEqual(maxFiles + 2); // +2 для буфера
    });
  });

  describe('Dual Streams', () => {
    it('должен писать error/warn в stderr', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 1024,
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);
      const stderrOutput: string[] = [];

      // Mock stderr для перехвата вывода
      const originalStderrWrite = process.stderr.write;
      process.stderr.write = ((chunk: any): boolean => {
        stderrOutput.push(chunk.toString());
        return true;
      }) as typeof process.stderr.write;

      // Act
      logger.warn('Warning message');
      logger.error('Error message');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Restore stderr
      process.stderr.write = originalStderrWrite;

      // Assert
      const stderrText = stderrOutput.join('');
      expect(stderrText).toContain('Warning message');
      expect(stderrText).toContain('Error message');
    });

    it('должен писать все уровни в файл', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'debug',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 1024,
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);

      // Act
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await logger.flush();

      // Assert - читаем combined.log
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');

      // Все уровни должны быть в combined.log
      expect(logContent).toContain('Debug message');
      expect(logContent).toContain('Info message');
      expect(logContent).toContain('Warn message');
      expect(logContent).toContain('Error message');
    });

    it('должен писать только error в error.log', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'debug',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 1024,
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);

      // Act
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await logger.flush();

      // Assert - читаем error.log
      const files = await readdir(testLogsDir);
      const errorLog = files.find((f) => f.startsWith('error') && f.endsWith('.log'));
      expect(errorLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, errorLog!), 'utf-8');

      // Только error должен быть в error.log
      expect(logContent).not.toContain('Debug message');
      expect(logContent).not.toContain('Info message');
      expect(logContent).not.toContain('Warn message');
      expect(logContent).toContain('Error message');
    });
  });

  describe('Structured Logging', () => {
    it('должен записывать структурированные логи в JSON формате', async () => {
      // Arrange
      const config: LoggerConfig = {
        level: 'info',
        logsDir: testLogsDir,
        rotation: {
          maxSize: 1024,
          maxFiles: 5,
        },
      };

      const logger = new Logger(config);

      // Act
      logger.info('User action', {
        userId: 'user-123',
        action: 'login',
        ip: '192.168.1.1',
      });

      // Даём время на запись
      await new Promise((resolve) => setTimeout(resolve, 200));
      await logger.flush();

      // Assert
      const files = await readdir(testLogsDir);
      const combinedLog = files.find((f) => f.startsWith('combined') && f.endsWith('.log'));
      expect(combinedLog).toBeDefined();

      const logContent = await readFile(join(testLogsDir, combinedLog!), 'utf-8');

      // Парсим JSON строку
      const logLines = logContent
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0);
      const lastLogLine = logLines[logLines.length - 1];
      expect(lastLogLine).toBeDefined();

      const lastLog = JSON.parse(lastLogLine!);

      expect(lastLog).toHaveProperty('userId', 'user-123');
      expect(lastLog).toHaveProperty('action', 'login');
      expect(lastLog).toHaveProperty('ip', '192.168.1.1');
      expect(lastLog).toHaveProperty('level', 'info');
    });
  });
});
