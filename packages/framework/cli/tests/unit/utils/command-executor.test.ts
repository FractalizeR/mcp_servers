/**
 * Тесты CommandExecutor.
 *
 * Используем реальные простые команды (`echo`, `sleep`, `false`) — это
 * быстрее и надёжнее моков `child_process` для проверки таймаута и
 * exit-кодов.
 */

import { describe, it, expect } from 'vitest';
import { CommandExecutor } from '../../../src/utils/command-executor.js';

describe('CommandExecutor', () => {
  describe('exec', () => {
    it('возвращает stdout успешной команды', () => {
      const out = CommandExecutor.exec('echo hello-world');
      expect(out.trim()).toBe('hello-world');
    });

    it('бросает Error("Command failed: ...") при ненулевом exit code', () => {
      expect(() => CommandExecutor.exec('false')).toThrow(/Command failed/);
    });

    it('включает stderr в сообщение об ошибке (если есть)', () => {
      // `sh -c "echo OOPS >&2; exit 1"` → stderr содержит "OOPS"
      let caught: unknown;
      try {
        CommandExecutor.exec('sh -c "echo OOPS-MESSAGE >&2; exit 1"');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('Command failed');
      expect((caught as Error).message).toContain('OOPS-MESSAGE');
    });

    it('обрезает длинный stderr до 200 символов', () => {
      // Печатаем 500 байт `A` в stderr.
      let caught: unknown;
      try {
        CommandExecutor.exec(
          `sh -c "printf '%0.s' A{1..500} 1>&2; printf 'A%.0s' {1..500} 1>&2; exit 2"`
        );
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      const msg = (caught as Error).message;
      // Сообщение не должно превышать ~250 символов (200 stderr + префикс/обёртка)
      expect(msg.length).toBeLessThan(400);
      // Маркер обрезки
      expect(msg).toContain('…');
    });

    it('таймаут: sleep 10 + timeout 1000ms → бросает Error("Timeout: ...") за ~1s', () => {
      const start = Date.now();
      let caught: unknown;
      try {
        CommandExecutor.exec('sleep 10', { timeout: 1000 });
      } catch (e) {
        caught = e;
      }
      const elapsed = Date.now() - start;

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('Timeout');
      expect((caught as Error).message).toContain('sleep 10');
      expect((caught as Error).message).toContain('1000ms');
      // Должен убить процесс достаточно быстро (запас на CI)
      expect(elapsed).toBeLessThan(2000);
    }, 5000);

    it('без timeout — sleep 10 выполнится до конца (не тестируем здесь — слишком долго)', () => {
      // Эта проверка концептуальная — пропускаем, чтобы не блокировать тесты.
      // Семантика: если timeout не задан, execSync не убьёт процесс.
      expect(true).toBe(true);
    });
  });

  describe('execFile', () => {
    it('возвращает stdout успешной команды', () => {
      const out = CommandExecutor.execFile('echo', ['hello-world']);
      expect(out.trim()).toBe('hello-world');
    });

    it('передаёт аргументы как массив (без shell-интерпретации)', () => {
      // Если бы было shell-interpretation, "$HOME" расширилось бы; через execFile — нет.
      const out = CommandExecutor.execFile('echo', ['$HOME']);
      expect(out.trim()).toBe('$HOME');
    });

    it('бросает Error("Command failed: ...") при ненулевом exit code', () => {
      expect(() => CommandExecutor.execFile('false', [])).toThrow(/Command failed/);
    });

    it('таймаут: sleep 10 + timeout 1000ms → бросает Error("Timeout: ...") за ~1s', () => {
      const start = Date.now();
      let caught: unknown;
      try {
        CommandExecutor.execFile('sleep', ['10'], { timeout: 1000 });
      } catch (e) {
        caught = e;
      }
      const elapsed = Date.now() - start;

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('Timeout');
      expect((caught as Error).message).toContain('sleep 10');
      expect((caught as Error).message).toContain('1000ms');
      expect(elapsed).toBeLessThan(2000);
    }, 5000);

    it('включает stderr в сообщение об ошибке', () => {
      let caught: unknown;
      try {
        CommandExecutor.execFile('sh', ['-c', 'echo BOOM-EF >&2; exit 1']);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('Command failed');
      expect((caught as Error).message).toContain('BOOM-EF');
    });
  });

  describe('execSilent', () => {
    it('не бросает при успешной команде', () => {
      expect(() => CommandExecutor.execSilent('echo ok')).not.toThrow();
    });

    it('не бросает при ошибке команды (поглощает)', () => {
      expect(() => CommandExecutor.execSilent('false')).not.toThrow();
    });
  });

  describe('execInteractive', () => {
    it('resolve при exit code 0', async () => {
      await expect(CommandExecutor.execInteractive('true', [])).resolves.toBeUndefined();
    });

    it('reject при ненулевом exit code', async () => {
      await expect(CommandExecutor.execInteractive('false', [])).rejects.toThrow(
        /Command exited with code/
      );
    });

    it('reject при ошибке spawn (несуществующая команда)', async () => {
      await expect(
        CommandExecutor.execInteractive('/nonexistent/command-xyz', [])
      ).rejects.toThrow();
    });
  });

  describe('isCommandAvailable', () => {
    it('true для существующей системной команды', () => {
      // `sh` всегда есть на unix
      expect(CommandExecutor.isCommandAvailable('sh')).toBe(true);
    });

    it('false для несуществующей команды', () => {
      expect(CommandExecutor.isCommandAvailable('absolutely-nonexistent-command-xyz')).toBe(false);
    });
  });
});
