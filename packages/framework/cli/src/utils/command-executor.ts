/**
 * Выполнение shell команд
 *
 * @module CommandExecutor
 * @description Утилита для выполнения shell команд с различными режимами вывода
 */

import { execSync, spawn } from 'node:child_process';

/**
 * Класс для выполнения shell команд
 *
 * @example
 * ```typescript
 * // Выполнить команду и получить вывод
 * const output = CommandExecutor.exec('echo "test"');
 *
 * // Проверить наличие команды
 * if (CommandExecutor.isCommandAvailable('node')) {
 *   console.log('Node.js установлен');
 * }
 * ```
 */
export class CommandExecutor {
  /**
   * Выполнить команду и вернуть stdout
   *
   * @param command - Команда для выполнения
   * @returns Вывод команды
   * @throws {Error} Если команда завершилась с ошибкой
   *
   * @example
   * ```typescript
   * const nodeVersion = CommandExecutor.exec('node --version');
   * console.log(nodeVersion); // v22.21.1
   * ```
   */
  static exec(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {
      throw new Error(`Command failed: ${command}`);
    }
  }

  /**
   * Выполнить команду тихо (подавить вывод)
   *
   * @param command - Команда для выполнения
   *
   * @example
   * ```typescript
   * // Выполнить команду без вывода
   * CommandExecutor.execSilent('npm install --silent');
   * ```
   */
  static execSilent(command: string): void {
    try {
      execSync(command, { stdio: 'ignore' });
    } catch {
      // Игнорируем ошибки
    }
  }

  /**
   * Выполнить команду интерактивно (с наследованием stdio)
   *
   * @param command - Команда для выполнения
   * @param args - Аргументы команды
   * @returns Promise, который разрешается после завершения команды
   * @throws {Error} Если команда завершилась с ненулевым кодом
   *
   * @example
   * ```typescript
   * // Запустить интерактивный процесс
   * await CommandExecutor.execInteractive('npm', ['init']);
   * ```
   */
  static async execInteractive(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'inherit' });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * Проверить, установлена ли команда
   *
   * @param command - Имя команды для проверки
   * @returns true, если команда доступна в системе
   *
   * @example
   * ```typescript
   * if (CommandExecutor.isCommandAvailable('git')) {
   *   console.log('Git установлен');
   * }
   * ```
   */
  static isCommandAvailable(command: string): boolean {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
