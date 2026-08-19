/**
 * Тесты процессного уровня контура секретов: uncaughtException/unhandledRejection
 * маскируются перед печатью, процесс завершается с кодом 1.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { installSecretGuard } from '../../../src/secrets/process-guard.js';
import { createMasker } from '../../../src/secrets/masker.js';

const SECRET = 'process-guard-secret-value-0123456789';

describe('installSecretGuard', () => {
  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
  });

  it('маскирует uncaughtException перед записью в stderr и завершает процесс с кодом 1', () => {
    const masker = createMasker({ clientEnv: { TOKEN: SECRET } });
    const written: string[] = [];
    const exitCodes: number[] = [];
    uninstall = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: (code) => exitCodes.push(code),
    });

    process.emit('uncaughtException', new Error(`boom with token ${SECRET}`));

    expect(written.join('')).not.toContain(SECRET);
    expect(written.join('')).toContain('***MASKED***');
    expect(exitCodes).toEqual([1]);
  });

  it('маскирует unhandledRejection перед записью в stderr', () => {
    const masker = createMasker({ clientEnv: { TOKEN: SECRET } });
    const written: string[] = [];
    const exitCodes: number[] = [];
    uninstall = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: (code) => exitCodes.push(code),
    });

    process.emit('unhandledRejection', new Error(`rejected with ${SECRET}`), Promise.resolve());

    expect(written.join('')).not.toContain(SECRET);
    expect(exitCodes).toEqual([1]);
  });

  it('обрабатывает non-Error значения (строки, объекты) без исключения', () => {
    const masker = createMasker({ clientEnv: {} });
    const written: string[] = [];
    uninstall = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: vi.fn(),
    });

    expect(() => {
      process.emit('uncaughtException', 'plain string reason' as unknown as Error);
    }).not.toThrow();
    expect(written.join('')).toContain('plain string reason');
  });

  it('uninstall снимает слушателей — повторное событие после uninstall не вызывает хук', () => {
    const masker = createMasker({ clientEnv: { TOKEN: SECRET } });
    const written: string[] = [];
    const guard = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: vi.fn(),
    });
    guard();

    // Безопасный "catch-all" слушатель — нужен только чтобы вручную сгенерированное
    // событие не долетело до глобального обработчика vitest (он трактует любой
    // необработанный uncaughtException как падение прогона). Сам факт того, что
    // written остаётся пустым, доказывает: хук installSecretGuard снят.
    const safetyNet = (): void => {};
    process.once('uncaughtException', safetyNet);
    try {
      process.emit('uncaughtException', new Error('after uninstall'));
    } finally {
      process.off('uncaughtException', safetyNet);
    }
    expect(written).toHaveLength(0);
  });

  it('по умолчанию использует process.stderr.write и process.exit (не бросает при построении)', () => {
    const masker = createMasker({ clientEnv: {} });
    uninstall = installSecretGuard({ masker });
    expect(typeof uninstall).toBe('function');
  });
});
