/**
 * Управление файлами и директориями
 *
 * @module FileManager
 * @description Утилита для работы с файловой системой: чтение/запись JSON и TOML,
 * управление директориями, проверка существования файлов
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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

/**
 * Класс для работы с файловой системой
 *
 * @example
 * ```typescript
 * // Чтение JSON файла
 * const config = await FileManager.readJSON<ConfigType>('config.json');
 *
 * // Запись данных в JSON
 * await FileManager.writeJSON('output.json', { key: 'value' });
 *
 * // Проверка существования
 * if (await FileManager.exists('file.txt')) {
 *   console.log('Файл существует');
 * }
 * ```
 */
export class FileManager {
  /**
   * Прочитать и распарсить JSON файл
   *
   * @param filePath - Путь к JSON файлу
   * @returns Распарсенные данные
   * @throws {Error} Если файл не существует или содержит невалидный JSON
   *
   * @example
   * ```typescript
   * interface Config {
   *   apiKey: string;
   * }
   * const config = await FileManager.readJSON<Config>('config.json');
   * ```
   */
  static async readJSON<T = unknown>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Записать данные в JSON файл с форматированием
   *
   * @param filePath - Путь к файлу для записи
   * @param data - Данные для записи
   * @throws {Error} Если не удалось записать файл
   *
   * @example
   * ```typescript
   * await FileManager.writeJSON('config.json', { apiKey: 'xxx' });
   * ```
   */
  static async writeJSON(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Прочитать и распарсить TOML файл
   *
   * @param filePath - Путь к TOML файлу
   * @returns Распарсенные данные
   * @throws {Error} Если файл не существует или содержит невалидный TOML
   *
   * @example
   * ```typescript
   * const config = await FileManager.readTOML<ConfigType>('config.toml');
   * ```
   */
  static async readTOML<T = unknown>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return toml.parse(content) as T;
  }

  /**
   * Записать данные в TOML файл
   *
   * @param filePath - Путь к файлу для записи
   * @param data - Данные для записи (должны быть сериализуемы в TOML)
   * @throws {Error} Если не удалось записать файл или данные не сериализуемы
   *
   * @example
   * ```typescript
   * await FileManager.writeTOML('config.toml', { server: { port: 3000 } });
   * ```
   */
  static async writeTOML(filePath: string, data: unknown): Promise<void> {
    const content = toml.stringify(data as toml.JsonMap);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Проверить существование файла или директории
   *
   * @param filePath - Путь для проверки
   * @returns true, если файл/директория существует
   *
   * @example
   * ```typescript
   * if (await FileManager.exists('/path/to/file')) {
   *   console.log('Файл найден');
   * }
   * ```
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
   *
   * @param dirPath - Путь к создаваемой директории
   * @throws {Error} Если не удалось создать директорию
   *
   * @example
   * ```typescript
   * await FileManager.ensureDir('/path/to/dir');
   * ```
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
   *
   * @param filePath - Путь к файлу
   * @param mode - Права доступа в формате octal (например, 0o600)
   * @throws {Error} Если файл не существует или не удалось изменить права
   *
   * @example
   * ```typescript
   * await FileManager.setPermissions('script.sh', 0o755);
   * ```
   */
  static async setPermissions(filePath: string, mode: number): Promise<void> {
    await fs.chmod(filePath, mode);
  }

  /**
   * Получить домашнюю директорию пользователя
   *
   * @returns Путь к домашней директории
   *
   * @example
   * ```typescript
   * const home = FileManager.getHomeDir();
   * console.log(home); // /home/user или C:\Users\user
   * ```
   */
  static getHomeDir(): string {
    return process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';
  }

  /**
   * Разрешить путь относительно домашней директории
   *
   * @param filePath - Путь (может начинаться с ~/)
   * @returns Абсолютный путь
   *
   * @example
   * ```typescript
   * const path = FileManager.resolvePath('~/config.json');
   * console.log(path); // /home/user/config.json
   * ```
   */
  static resolvePath(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(this.getHomeDir(), filePath.slice(2));
    }
    return path.resolve(filePath);
  }
}
