/**
 * Выполнение shell команд
 */

import { execSync, spawn } from 'child_process';

export class CommandExecutor {
  /**
   * Выполнить команду и вернуть stdout
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
