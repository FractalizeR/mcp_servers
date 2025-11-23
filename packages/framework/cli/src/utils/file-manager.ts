/**
 * Управление файлами конфигурации
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as toml from '@iarna/toml';

/**
 * ErrnoException интерфейс
 */
interface ErrnoException extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
}

/**
 * Type guard для проверки ErrnoException
 */
function isErrnoException(error: unknown): error is ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>)['code'] === 'string'
  );
}

export class FileManager {
  /**
   * Прочитать и распарсить JSON файл
   */
  static async readJSON<T = unknown>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Записать данные в JSON файл с форматированием
   */
  static async writeJSON(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Прочитать и распарсить TOML файл
   */
  static async readTOML<T = unknown>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return toml.parse(content) as T;
  }

  /**
   * Записать данные в TOML файл
   */
  static async writeTOML(filePath: string, data: unknown): Promise<void> {
    const content = toml.stringify(data as toml.JsonMap);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Проверить существование файла
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Создать директорию (если не существует)
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err: unknown) {
      // Игнорируем ошибку, если директория уже существует
      if (!isErrnoException(err)) {
        throw err;
      }
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
  }

  /**
   * Установить права доступа к файлу
   */
  static async setPermissions(filePath: string, mode: number): Promise<void> {
    await fs.chmod(filePath, mode);
  }

  /**
   * Получить домашнюю директорию пользователя
   */
  static getHomeDir(): string {
    return process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';
  }

  /**
   * Разрешить путь относительно домашней директории
   */
  static resolvePath(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(this.getHomeDir(), filePath.slice(2));
    }
    return path.resolve(filePath);
  }
}
