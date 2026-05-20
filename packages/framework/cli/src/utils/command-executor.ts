/**
 * Выполнение shell команд
 *
 * @module CommandExecutor
 * @description Утилита для выполнения shell команд с различными режимами вывода
 */

import { execFileSync, execSync, spawn } from 'node:child_process';

/**
 * Опции для {@link CommandExecutor.exec}.
 */
export interface ExecOptions {
  /**
   * Таймаут выполнения в миллисекундах. При превышении — процесс убивается
   * `SIGKILL`, выбрасывается `Error('Timeout: <command> exceeded <ms>ms')`.
   */
  timeout?: number;
}

/**
 * Максимальная длина stderr в сообщении об ошибке.
 *
 * Цель — не раздувать message длинными выводами CLI (некоторые программы
 * пишут многостраничный traceback). 200 символов достаточно для диагностики.
 */
const STDERR_PREVIEW_LIMIT = 200;

/**
 * Извлечь и обрезать stderr из объекта ошибки `execSync`/`execFileSync`.
 */
function extractStderr(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const stderr = (err as { stderr?: unknown }).stderr;
  if (stderr === undefined || stderr === null) return undefined;
  const text = typeof stderr === 'string' ? stderr : String(stderr);
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.length > STDERR_PREVIEW_LIMIT
    ? `${trimmed.slice(0, STDERR_PREVIEW_LIMIT)}…`
    : trimmed;
}

/**
 * Класс для выполнения shell команд
 *
 * @example
 * ```typescript
 * // Выполнить команду и получить вывод
 * const output = CommandExecutor.exec('echo "test"');
 *
 * // С таймаутом
 * const output = CommandExecutor.exec('claude mcp list', { timeout: 5000 });
 *
 * // Безопасное выполнение без shell-интерпретации
 * const out = CommandExecutor.execFile('claude', ['mcp', 'list'], { timeout: 5000 });
 *
 * // Проверить наличие команды
 * if (CommandExecutor.isCommandAvailable('node')) {
 *   console.log('Node.js установлен');
 * }
 * ```
 */
export class CommandExecutor {
  /**
   * Выполнить команду и вернуть stdout.
   *
   * @param command - Команда для выполнения
   * @param options - Опции выполнения (включая `timeout`)
   * @returns Вывод команды
   * @throws {Error} Если команда завершилась с ошибкой или превысила таймаут
   *
   * @example
   * ```typescript
   * const nodeVersion = CommandExecutor.exec('node --version');
   * console.log(nodeVersion); // v22.21.1
   * ```
   */
  static exec(command: string, options: ExecOptions = {}): string {
    const execOptions: Parameters<typeof execSync>[1] = {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    };
    if (options.timeout !== undefined) {
      execOptions.timeout = options.timeout;
      execOptions.killSignal = 'SIGKILL';
    }

    try {
      return execSync(command, execOptions) as string;
    } catch (err: unknown) {
      // `execSync` бросает ошибку с `signal === 'SIGKILL'` при таймауте.
      const errorObj = err as { signal?: string; code?: string | number };
      if (
        options.timeout !== undefined &&
        (errorObj?.signal === 'SIGKILL' || errorObj?.code === 'ETIMEDOUT')
      ) {
        throw new Error(`Timeout: ${command} exceeded ${String(options.timeout)}ms`);
      }
      const stderr = extractStderr(err);
      throw new Error(
        stderr ? `Command failed: ${command} (${stderr})` : `Command failed: ${command}`
      );
    }
  }

  /**
   * Выполнить команду через `execFileSync` без shell-интерпретации.
   *
   * Этот метод предпочтительнее {@link exec} в случаях, когда команда и её
   * аргументы фиксированы и НЕ должны интерпретироваться шеллом
   * (избегаем риска инъекции, кросс-платформенных проблем с кавычками и т.п.).
   *
   * @param command - Имя исполняемого файла (резолвится через PATH) или абсолютный путь
   * @param args - Аргументы команды (каждый — отдельный элемент массива)
   * @param options - Опции (включая `timeout` в мс)
   * @returns stdout команды
   * @throws {Error} Если команда завершилась с ненулевым кодом или превысила таймаут
   *
   * @example
   * ```typescript
   * const out = CommandExecutor.execFile('claude', ['mcp', 'list'], { timeout: 5000 });
   * ```
   */
  static execFile(command: string, args: string[], options: ExecOptions = {}): string {
    const execOptions: Parameters<typeof execFileSync>[2] = {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    };
    if (options.timeout !== undefined) {
      execOptions.timeout = options.timeout;
      execOptions.killSignal = 'SIGKILL';
    }

    const displayCmd = `${command} ${args.join(' ')}`.trim();

    try {
      return execFileSync(command, args, execOptions) as string;
    } catch (err: unknown) {
      const errorObj = err as { signal?: string; code?: string | number };
      if (
        options.timeout !== undefined &&
        (errorObj?.signal === 'SIGKILL' || errorObj?.code === 'ETIMEDOUT')
      ) {
        throw new Error(`Timeout: ${displayCmd} exceeded ${String(options.timeout)}ms`);
      }
      const stderr = extractStderr(err);
      throw new Error(
        stderr ? `Command failed: ${displayCmd} (${stderr})` : `Command failed: ${displayCmd}`
      );
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
          reject(new Error(`Command exited with code ${String(code)}`));
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
