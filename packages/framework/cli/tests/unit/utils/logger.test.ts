/**
 * Тесты Logger.
 *
 * Стэтик класс; проверяем что методы пишут в правильный stream и не бросают.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info пишет в console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Logger.info('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.join(' ')).toContain('hello');
  });

  it('success пишет в console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Logger.success('ok');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.join(' ')).toContain('ok');
  });

  it('warn пишет в console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Logger.warn('careful');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.join(' ')).toContain('careful');
  });

  it('error пишет в console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Logger.error('bad');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.join(' ')).toContain('bad');
  });

  it('newLine пишет пустую строку', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Logger.newLine();
    expect(spy).toHaveBeenCalled();
  });

  it('header пишет заголовок (несколько строк)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Logger.header('Section');
    expect(spy).toHaveBeenCalled();
    // Найдём строку с текстом
    const allCalls = spy.mock.calls.flat().join('\n');
    expect(allCalls).toContain('Section');
  });

  it('spinner возвращает объект Ora с методами stop/succeed/fail', () => {
    // ora пишет в stderr. Просто проверим что вернулся объект с нужными методами.
    const sp = Logger.spinner('loading');
    expect(typeof sp.stop).toBe('function');
    expect(typeof sp.succeed).toBe('function');
    expect(typeof sp.fail).toBe('function');
    sp.stop();
  });
});
