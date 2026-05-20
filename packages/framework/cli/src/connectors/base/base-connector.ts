/**
 * Base connector implementation for MCP clients
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MCPConnector } from './connector.interface.js';
import type { ConnectionStatus, MCPClientInfo } from '../../types/client.types.js';
import type { ServerLaunchSpec } from '../../types/launch.types.js';

/**
 * Абстрактный базовый класс для всех MCP коннекторов
 * Предоставляет общую функциональность и utility методы.
 *
 * @example
 * ```typescript
 * class MyConnector extends BaseConnector {
 *   getClientInfo(): MCPClientInfo { ... }
 *   async isInstalled(): Promise<boolean> { ... }
 *   async connect(spec: ServerLaunchSpec): Promise<void> { ... }
 *   // ... остальные методы
 * }
 * ```
 */
export abstract class BaseConnector implements MCPConnector {
  /**
   * Абстрактные методы - должны быть реализованы наследниками
   */
  abstract getClientInfo(): MCPClientInfo;
  abstract isInstalled(): Promise<boolean>;
  abstract getStatus(): Promise<ConnectionStatus>;
  abstract connect(spec: ServerLaunchSpec): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getLaunchSpec(): Promise<ServerLaunchSpec | null>;

  /**
   * Базовая валидация спецификации запуска.
   * Наследники могут переопределить метод, вызвав `super.validateLaunchSpec(spec)`
   * для сохранения базовых проверок.
   *
   * Проверки:
   * - `spec.command` непустой.
   * - Если `spec.command` — абсолютный путь, проверяется существование файла.
   * - Если `spec.command === 'node'`, ищется первый абсолютный путь в `spec.args`
   *   (учитывая возможные Node-флаги типа `--no-warnings`) и проверяется его существование.
   * - Значения `spec.env` обязаны быть строками (runtime-проверка для JS-вызовов).
   *
   * @param spec - Спецификация для валидации
   * @returns Массив ошибок валидации (пустой если валидация успешна)
   */
  async validateLaunchSpec(spec: ServerLaunchSpec): Promise<string[]> {
    const errors: string[] = [];

    if (!spec.command || spec.command.trim().length === 0) {
      errors.push('Команда запуска (command) обязательна');
      return errors;
    }

    if (path.isAbsolute(spec.command)) {
      const ok = await this.fileExists(spec.command);
      if (!ok) {
        errors.push(`Файл команды не найден: ${spec.command}`);
      }
    } else if (spec.command === 'node') {
      const scriptPath = spec.args.find((a) => path.isAbsolute(a));
      if (!scriptPath) {
        errors.push('Для команды `node` не найден абсолютный путь к скрипту в args');
      } else {
        const ok = await this.fileExists(scriptPath);
        if (!ok) {
          errors.push(`Скрипт не найден: ${scriptPath}`);
        }
      }
    }

    if (spec.env && typeof spec.env === 'object') {
      for (const [key, value] of Object.entries(spec.env)) {
        if (typeof value !== 'string') {
          errors.push(`Значение env.${key} должно быть строкой, получено: ${typeof value}`);
        }
      }
    }

    return errors;
  }

  /**
   * Проверка существования файла без выброса исключений.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверить поддержку текущей платформы
   * @returns true если текущая платформа поддерживается клиентом
   */
  protected isPlatformSupported(): boolean {
    const platform = os.platform();
    const supportedPlatforms = this.getClientInfo().platforms;
    return supportedPlatforms.includes(platform as 'darwin' | 'linux' | 'win32');
  }

  /**
   * Получить текущую платформу
   * @returns Текущая платформа (darwin, linux, win32, и т.д.)
   */
  protected getCurrentPlatform(): ReturnType<typeof os.platform> {
    return os.platform();
  }
}
