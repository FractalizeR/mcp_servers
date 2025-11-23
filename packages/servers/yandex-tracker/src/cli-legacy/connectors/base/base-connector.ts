/**
 * Базовый класс для всех MCP коннекторов
 */

import type { MCPConnector, MCPServerConfig } from './connector.interface.js';
import * as os from 'os';

export abstract class BaseConnector implements MCPConnector {
  abstract getClientInfo(): ReturnType<MCPConnector['getClientInfo']>;
  abstract isInstalled(): ReturnType<MCPConnector['isInstalled']>;
  abstract getStatus(): ReturnType<MCPConnector['getStatus']>;
  abstract connect(config: MCPServerConfig): ReturnType<MCPConnector['connect']>;
  abstract disconnect(): ReturnType<MCPConnector['disconnect']>;

  /**
   * Базовая валидация конфигурации
   */
  validateConfig(config: MCPServerConfig): Promise<string[]> {
    const errors: string[] = [];

    if (!config.token || config.token.trim().length === 0) {
      errors.push('OAuth токен обязателен');
    }

    if (!config.orgId || config.orgId.trim().length === 0) {
      errors.push('ID организации обязателен');
    }

    if (!config.projectPath || config.projectPath.trim().length === 0) {
      errors.push('Путь к проекту обязателен');
    }

    return Promise.resolve(errors);
  }

  /**
   * Проверить, поддерживается ли текущая платформа
   */
  protected isPlatformSupported(): boolean {
    const platform = os.platform();
    const supportedPlatforms = this.getClientInfo().platforms;
    return supportedPlatforms.includes(platform as 'darwin' | 'linux' | 'win32');
  }

  /**
   * Получить текущую платформу
   */
  protected getCurrentPlatform(): ReturnType<typeof os.platform> {
    return os.platform();
  }
}
