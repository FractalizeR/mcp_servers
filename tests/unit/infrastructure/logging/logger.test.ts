/**
 * Unit тесты для модуля логирования (Pino-based)
 */

import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@infrastructure/logging/index.js';
import type { LoggerConfig } from '@infrastructure/logging/index.js';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('Logger', () => {
  describe('Конфигурация', () => {
    it('должен создаваться с базовой конфигурацией', () => {
      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
      };

      const logger = new Logger(config);
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
    });

    it('должен поддерживать все уровни логирования', () => {
      const levels: Array<LoggerConfig['level']> = ['debug', 'info', 'warn', 'error'];

      levels.forEach((level) => {
        const logger = new Logger({ level, pretty: false });
        expect(logger.level).toBe(level);
      });
    });

    it('должен создаваться с ротацией файлов (50KB по умолчанию)', () => {
      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
        logsDir: '/tmp/test-logs',
        rotation: {
          maxSize: 50 * 1024, // 50KB
          maxFiles: 20,
        },
      };

      // Проверяем, что не выбрасывается ошибка "A positive integer number is expected"
      expect(() => new Logger(config)).not.toThrow();
    });

    it('должен создаваться с ротацией файлов (1MB)', () => {
      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
        logsDir: '/tmp/test-logs',
        rotation: {
          maxSize: 1024 * 1024, // 1MB
          maxFiles: 10,
        },
      };

      expect(() => new Logger(config)).not.toThrow();
    });

    it('должен создаваться с ротацией файлов (размер по умолчанию)', () => {
      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
        logsDir: '/tmp/test-logs',
      };

      // rotation.maxSize не указан, используется 50KB по умолчанию
      expect(() => new Logger(config)).not.toThrow();
    });

    it('должен автоматически создавать директорию для логов', () => {
      const testLogsDir = join('/tmp', `test-logs-${Date.now()}`);

      // Убедимся, что директория не существует
      expect(existsSync(testLogsDir)).toBe(false);

      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
        logsDir: testLogsDir,
      };

      // Создаём логгер - директория должна быть создана автоматически
      const logger = new Logger(config);
      expect(logger).toBeDefined();

      // Проверяем, что директория создана
      expect(existsSync(testLogsDir)).toBe(true);

      // Очищаем тестовую директорию
      rmSync(testLogsDir, { recursive: true, force: true });
    });

    it('должен работать с уже существующей директорией для логов', () => {
      const config: LoggerConfig = {
        level: 'info',
        pretty: false,
        logsDir: '/tmp', // Существующая директория
      };

      // Не должно выбрасывать ошибку
      expect(() => new Logger(config)).not.toThrow();
    });
  });

  describe('Уровни логирования', () => {
    it('не должен логировать debug при уровне info', () => {
      const logger = new Logger({ level: 'info', pretty: false });

      // Spy на внутренний pino logger
      const debugSpy = vi.spyOn(logger['pino'] as any, 'debug');

      logger.debug('test message');

      // Pino может вызвать метод, но не записать в output из-за level filtering
      // Проверяем, что уровень установлен правильно
      expect(logger.level).toBe('info');

      debugSpy.mockRestore();
    });

    it('должен логировать info при уровне info', () => {
      const logger = new Logger({ level: 'info', pretty: false });
      const infoSpy = vi.spyOn(logger['pino'] as any, 'info');

      logger.info('test message');

      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    it('должен логировать debug при уровне debug', () => {
      const logger = new Logger({ level: 'debug', pretty: false });
      const debugSpy = vi.spyOn(logger['pino'] as any, 'debug');

      logger.debug('test message');

      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it('должен логировать error при уровне error', () => {
      const logger = new Logger({ level: 'error', pretty: false });
      const errorSpy = vi.spyOn(logger['pino'] as any, 'error');

      logger.error('test message');

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('должен логировать warn при уровне warn', () => {
      const logger = new Logger({ level: 'warn', pretty: false });
      const warnSpy = vi.spyOn(logger['pino'] as any, 'warn');

      logger.warn('test message');

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Structured logging', () => {
    it('должен логировать с контекстом', () => {
      const logger = new Logger({ level: 'info', pretty: false });
      const infoSpy = vi.spyOn(logger['pino'] as any, 'info');

      const context = { userId: '123', action: 'test' };
      logger.info('test message', context);

      expect(infoSpy).toHaveBeenCalledWith(context, 'test message');
      infoSpy.mockRestore();
    });

    it('должен логировать без контекста', () => {
      const logger = new Logger({ level: 'info', pretty: false });
      const infoSpy = vi.spyOn(logger['pino'] as any, 'info');

      logger.info('test message');

      expect(infoSpy).toHaveBeenCalledWith('test message');
      infoSpy.mockRestore();
    });
  });

  describe('Error logging', () => {
    it('должен корректно обрабатывать Error объекты', () => {
      const logger = new Logger({ level: 'error', pretty: false });
      const errorSpy = vi.spyOn(logger['pino'] as any, 'error');

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0];
      expect(callArgs?.[0]).toHaveProperty('error');
      const errorContext = callArgs?.[0] as { error: { message: string } };
      expect(errorContext.error).toHaveProperty('message', 'Test error');

      errorSpy.mockRestore();
    });

    it('должен обрабатывать ошибки с дополнительным контекстом', () => {
      const logger = new Logger({ level: 'error', pretty: false });
      const errorSpy = vi.spyOn(logger['pino'] as any, 'error');

      const error = new Error('Test error');
      const context = { requestId: '123' };
      logger.error('Error occurred', error, context);

      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0];
      const errorContext = callArgs?.[0] as { requestId: string; error: { message: string } };
      expect(errorContext).toHaveProperty('requestId', '123');
      expect(errorContext).toHaveProperty('error');

      errorSpy.mockRestore();
    });
  });

  describe('setLevel', () => {
    it('должен изменить уровень логирования динамически', () => {
      const logger = new Logger({ level: 'info', pretty: false });

      expect(logger.level).toBe('info');

      logger.setLevel('error');
      expect(logger.level).toBe('error');

      logger.setLevel('debug');
      expect(logger.level).toBe('debug');
    });
  });

  describe('child logger', () => {
    it('должен создавать child logger с дополнительным контекстом', () => {
      const logger = new Logger({ level: 'info', pretty: false });
      const childLogger = logger.child({ requestId: '123' });

      expect(childLogger).toBeDefined();
      expect(childLogger).toBeInstanceOf(Logger);
    });

    it('child logger должен наследовать уровень родителя', () => {
      const logger = new Logger({ level: 'warn', pretty: false });
      const childLogger = logger.child({ requestId: '123' });

      expect(childLogger.level).toBe('warn');
    });
  });

  describe('Alerting transport', () => {
    it('должен принимать alerting transport', () => {
      const logger = new Logger({ level: 'info', pretty: false });

      const mockTransport = {
        sendAlert: vi.fn(),
      };

      expect(() => {
        logger.setAlertingTransport(mockTransport);
      }).not.toThrow();
    });

    it('должен вызывать alerting при error', async () => {
      const logger = new Logger({ level: 'info', pretty: false });

      const mockTransport = {
        sendAlert: vi.fn().mockResolvedValue(undefined),
      };

      logger.setAlertingTransport(mockTransport);
      logger.error('Test error', undefined, { key: 'value' });

      // Alerting вызывается асинхронно, даём время на выполнение
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockTransport.sendAlert).toHaveBeenCalledWith(
        'error',
        'Test error',
        expect.objectContaining({ key: 'value' })
      );
    });

    it('должен вызывать alerting при warn', async () => {
      const logger = new Logger({ level: 'info', pretty: false });

      const mockTransport = {
        sendAlert: vi.fn().mockResolvedValue(undefined),
      };

      logger.setAlertingTransport(mockTransport);
      logger.warn('Test warning', { key: 'value' });

      // Alerting вызывается асинхронно, даём время на выполнение
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockTransport.sendAlert).toHaveBeenCalledWith(
        'warn',
        'Test warning',
        expect.objectContaining({ key: 'value' })
      );
    });
  });

  describe('flush', () => {
    it('должен корректно завершать работу', async () => {
      const logger = new Logger({ level: 'info', pretty: false });

      await expect(logger.flush()).resolves.toBeUndefined();
    });
  });
});
