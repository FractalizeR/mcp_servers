/**
 * Unit тесты для модуля логирования
 */

import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import type { MockInstance } from 'vitest';
import { Logger } from '@infrastructure/logger.js';

describe('Logger', () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Уровни логирования', () => {
    it('не должен логировать debug при уровне info', () => {
      const logger = new Logger('info');
      logger.debug('test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('должен логировать info при уровне info', () => {
      const logger = new Logger('info');
      logger.info('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain('test message');
    });

    it('должен логировать debug при уровне debug', () => {
      const logger = new Logger('debug');
      logger.debug('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain('test message');
    });

    it('не должен логировать info при уровне error', () => {
      const logger = new Logger('error');
      logger.info('test message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('должен логировать error при уровне error', () => {
      const logger = new Logger('error');
      logger.error('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain('test message');
    });

    it('должен логировать warn при уровне warn', () => {
      const logger = new Logger('warn');
      logger.warn('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain('test message');
    });
  });

  describe('Форматирование сообщений', () => {
    it('должен включать временную метку в ISO формате', () => {
      const logger = new Logger('info');
      logger.info('test message');

      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('должен включать уровень логирования в верхнем регистре', () => {
      const logger = new Logger('info');
      logger.info('test message');

      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(logOutput).toContain('INFO');
    });

    it('должен форматировать дополнительные аргументы как JSON', () => {
      const logger = new Logger('info');
      const data = { key: 'value', number: 42 };
      logger.info('test message', data);

      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(logOutput).toContain('"key":"value"');
      expect(logOutput).toContain('"number":42');
    });

    it('должен корректно обрабатывать несколько дополнительных аргументов', () => {
      const logger = new Logger('info');
      logger.info('test message', 'arg1', 'arg2', 123);

      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(logOutput).toContain('test message');
      expect(logOutput).toContain('arg1');
      expect(logOutput).toContain('arg2');
      expect(logOutput).toContain('123');
    });
  });

  describe('setLevel', () => {
    it('должен изменить уровень логирования динамически', () => {
      const logger = new Logger('info');

      // info не логируется при уровне error
      logger.setLevel('error');
      logger.info('test message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // error логируется при уровне error
      logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Иерархия уровней', () => {
    it('debug < info < warn < error', () => {
      const logger = new Logger('warn');

      logger.debug('debug');
      logger.info('info');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.warn('warn');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      logger.error('error');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });
});
