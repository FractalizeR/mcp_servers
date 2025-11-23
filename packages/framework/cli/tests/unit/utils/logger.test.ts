import { describe, it, expect } from 'vitest';
import { Logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  it('should have all methods', () => {
    expect(Logger.header).toBeDefined();
    expect(Logger.info).toBeDefined();
    expect(Logger.success).toBeDefined();
    expect(Logger.error).toBeDefined();
    expect(Logger.warn).toBeDefined();
    expect(Logger.newLine).toBeDefined();
    expect(Logger.spinner).toBeDefined();
  });

  // Полное тестирование сложно т.к. выводит в console
  // Основное - проверка что методы существуют и не падают
  it('should not throw on basic usage', () => {
    expect(() => Logger.info('test')).not.toThrow();
    expect(() => Logger.success('test')).not.toThrow();
    expect(() => Logger.error('test')).not.toThrow();
    expect(() => Logger.warn('test')).not.toThrow();
    expect(() => Logger.newLine()).not.toThrow();
    expect(() => Logger.header('test')).not.toThrow();
  });

  it('should create spinner', () => {
    const spinner = Logger.spinner('Loading...');
    expect(spinner).toBeDefined();
    expect(spinner.stop).toBeDefined();
    spinner.stop();
  });
});
