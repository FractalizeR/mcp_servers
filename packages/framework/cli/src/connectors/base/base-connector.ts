/**
 * Base connector implementation for MCP clients
 * @packageDocumentation
 */

import * as os from 'node:os';
import type { MCPConnector } from './connector.interface.js';
import type { BaseMCPServerConfig } from '../../types.js';

/**
 * Абстрактный базовый класс для всех MCP коннекторов
 * Предоставляет общую функциональность и utility методы
 *
 * @template TConfig - Тип конфигурации MCP сервера
 *
 * @example
 * ```typescript
 * class MyConnector extends BaseConnector<MyServerConfig> {
 *   getClientInfo(): MCPClientInfo {
 *     return {
 *       name: 'my-client',
 *       displayName: 'My Client',
 *       description: 'My MCP Client',
 *       configPath: '/path/to/config',
 *       platforms: ['darwin', 'linux'],
 *     };
 *   }
 *
 *   async isInstalled(): Promise<boolean> {
 *     // implementation
 *   }
 *
 *   // ... other methods
 * }
 * ```
 */
export abstract class BaseConnector<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig>
  implements MCPConnector<TConfig>
{
  /**
   * Абстрактные методы - должны быть реализованы наследниками
   */
  abstract getClientInfo(): ReturnType<MCPConnector<TConfig>['getClientInfo']>;
  abstract isInstalled(): ReturnType<MCPConnector<TConfig>['isInstalled']>;
  abstract getStatus(): ReturnType<MCPConnector<TConfig>['getStatus']>;
  abstract connect(config: TConfig): ReturnType<MCPConnector<TConfig>['connect']>;
  abstract disconnect(): ReturnType<MCPConnector<TConfig>['disconnect']>;

  /**
   * Базовая валидация конфигурации
   * Проверяет обязательные поля BaseMCPServerConfig
   *
   * Наследники могут переопределить этот метод для добавления своих правил валидации.
   * При переопределении рекомендуется вызывать super.validateConfig() для сохранения базовой валидации.
   *
   * @param config - Конфигурация для валидации
   * @returns Массив ошибок валидации (пустой если валидация успешна)
   *
   * @example
   * ```typescript
   * async validateConfig(config: MyServerConfig): Promise<string[]> {
   *   const errors = await super.validateConfig(config);
   *
   *   if (!config.apiKey) {
   *     errors.push('API ключ обязателен');
   *   }
   *
   *   return errors;
   * }
   * ```
   */
  validateConfig(config: TConfig): Promise<string[]> {
    const errors: string[] = [];

    // Проверка projectPath
    if (!config.projectPath || config.projectPath.trim().length === 0) {
      errors.push('Путь к проекту обязателен');
    }

    // Проверка logLevel (если указан)
    if (config.logLevel) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push(
          `Неверный уровень логирования: ${config.logLevel}. Допустимые: ${validLevels.join(', ')}`
        );
      }
    }

    return Promise.resolve(errors);
  }

  /**
   * Проверить поддержку текущей платформы
   * @returns true если текущая платформа поддерживается клиентом
   *
   * @example
   * ```typescript
   * async connect(config: TConfig): Promise<void> {
   *   if (!this.isPlatformSupported()) {
   *     throw new Error(`Платформа ${this.getCurrentPlatform()} не поддерживается`);
   *   }
   *   // ... rest of connect logic
   * }
   * ```
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
