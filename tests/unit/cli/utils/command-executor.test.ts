/**
 * Unit тесты для CommandExecutor
 */

import { describe, it, expect } from 'vitest';
import { CommandExecutor } from '@cli/utils/command-executor.js';

describe('CommandExecutor', () => {
  describe('exec', () => {
    it('должен выполнить команду и вернуть stdout', () => {
      const result = CommandExecutor.exec('echo "Hello World"');

      expect(result.trim()).toBe('Hello World');
    });

    it('должен выбросить ошибку для несуществующей команды', () => {
      expect(() => CommandExecutor.exec('nonexistent-command-xyz')).toThrow(
        'Command failed: nonexistent-command-xyz'
      );
    });

    it('должен выбросить ошибку для команды с ненулевым exit code', () => {
      expect(() => CommandExecutor.exec('false')).toThrow('Command failed: false');
    });
  });

  describe('execSilent', () => {
    it('должен выполнить команду тихо (без вывода)', () => {
      // Не должно быть ошибок
      expect(() => CommandExecutor.execSilent('echo "Silent"')).not.toThrow();
    });

    it('не должен выбросить ошибку для несуществующей команды', () => {
      // execSilent игнорирует ошибки
      expect(() => CommandExecutor.execSilent('nonexistent-command-xyz')).not.toThrow();
    });

    it('не должен выбросить ошибку для команды с ненулевым exit code', () => {
      // execSilent игнорирует ошибки
      expect(() => CommandExecutor.execSilent('false')).not.toThrow();
    });
  });

  describe('execInteractive', () => {
    it('должен выполнить команду успешно', async () => {
      await expect(CommandExecutor.execInteractive('echo', ['test'])).resolves.toBeUndefined();
    });

    it('должен выбросить ошибку для несуществующей команды', async () => {
      await expect(
        CommandExecutor.execInteractive('nonexistent-command-xyz', [])
      ).rejects.toThrow();
    });

    it('должен выбросить ошибку для команды с ненулевым exit code', async () => {
      await expect(CommandExecutor.execInteractive('false', [])).rejects.toThrow(
        'Command exited with code 1'
      );
    });
  });

  describe('isCommandAvailable', () => {
    it('должен вернуть true для существующей команды', () => {
      const result = CommandExecutor.isCommandAvailable('echo');

      expect(result).toBe(true);
    });

    it('должен вернуть false для несуществующей команды', () => {
      const result = CommandExecutor.isCommandAvailable('nonexistent-command-xyz-123');

      expect(result).toBe(false);
    });

    it('должен вернуть true для node', () => {
      // node должен быть установлен (зависимость проекта)
      const result = CommandExecutor.isCommandAvailable('node');

      expect(result).toBe(true);
    });
  });
});
