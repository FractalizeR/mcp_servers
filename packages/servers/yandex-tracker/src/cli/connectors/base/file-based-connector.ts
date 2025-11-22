/**
 * Базовый класс для file-based MCP коннекторов (JSON/TOML конфигурации)
 */

import * as path from 'path';
import { BaseConnector } from './base-connector.js';
import type {
  MCPServerConfig,
  ConnectionStatus,
  MCPClientConfig,
  MCPClientServerConfig,
} from './connector.interface.js';
import { FileManager } from '../../utils/file-manager.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '#constants';
import { isError } from '#common/type-guards.js';

/**
 * Формат конфигурационного файла
 */
export type ConfigFormat = 'json' | 'toml';

/**
 * Базовый класс для connectors, работающих с файлами конфигурации
 *
 * @template TKey - Ключ для серверов в конфиге ('mcpServers', 'mcp_servers' и т.д.)
 * @template TFormat - Формат файла ('json' или 'toml')
 *
 * @example
 * // JSON connector с ключом mcpServers
 * class MyConnector extends FileBasedConnector<'mcpServers', 'json'> {
 *   protected getConfigPath(): string {
 *     return path.join(os.homedir(), '.my-client/config.json');
 *   }
 * }
 *
 * // TOML connector с ключом mcp_servers
 * class MyTOMLConnector extends FileBasedConnector<'mcp_servers', 'toml'> {
 *   protected getConfigPath(): string {
 *     return path.join(os.homedir(), '.my-client/config.toml');
 *   }
 * }
 */
export abstract class FileBasedConnector<
  TKey extends string = 'mcpServers',
  TFormat extends ConfigFormat = 'json',
> extends BaseConnector {
  /**
   * Получить путь к конфигурационному файлу
   * Должен быть реализован в подклассе
   */
  protected abstract getConfigPath(): string;

  /**
   * Получить ключ для серверов в конфиге
   * По умолчанию 'mcpServers', можно переопределить
   */
  protected getServerKey(): TKey {
    return 'mcpServers' as TKey;
  }

  /**
   * Получить формат файла
   * По умолчанию 'json', можно переопределить
   */
  protected getConfigFormat(): TFormat {
    return 'json' as TFormat;
  }

  /**
   * Проверить, установлен ли клиент
   * По умолчанию проверяет наличие директории конфига
   */
  async isInstalled(): Promise<boolean> {
    const configDir = path.dirname(this.getConfigPath());
    return FileManager.exists(configDir);
  }

  /**
   * Получить статус подключения
   */
  async getStatus(): Promise<ConnectionStatus> {
    try {
      const configPath = this.getConfigPath();

      if (!(await FileManager.exists(configPath))) {
        return { connected: false, error: 'Конфигурационный файл не найден' };
      }

      const config = await this.readConfig();
      const serverKey = this.getServerKey();
      const servers = config[serverKey];

      if (servers?.[MCP_SERVER_NAME]) {
        return {
          connected: true,
          details: {
            configPath,
            metadata: { serverConfig: servers[MCP_SERVER_NAME] },
          },
        };
      }

      return { connected: false };
    } catch (error) {
      const errorMessage = isError(error) ? error.message : String(error);
      return {
        connected: false,
        error: `Ошибка чтения конфига: ${errorMessage}`,
      };
    }
  }

  /**
   * Подключить MCP сервер
   */
  async connect(serverConfig: MCPServerConfig): Promise<void> {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);

    // Создать директорию если не существует
    await FileManager.ensureDir(configDir);

    // Прочитать существующую конфигурацию или создать новую
    let config: MCPClientConfig<TKey>;
    if (await FileManager.exists(configPath)) {
      config = await this.readConfig();
    } else {
      config = this.createDefaultConfig();
    }

    // Добавить/обновить MCP сервер
    const serverKey = this.getServerKey();
    config[serverKey] ??= {};
    // Type assertion needed for generic type modification
    const servers: Record<string, MCPClientServerConfig> = config[serverKey];
    servers[MCP_SERVER_NAME] = {
      command: 'node',
      args: [path.join(serverConfig.projectPath, SERVER_ENTRY_POINT)],
      env: {
        [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: serverConfig.token,
        [ENV_VAR_NAMES.YANDEX_ORG_ID]: serverConfig.orgId,
        [ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE]: serverConfig.apiBase ?? DEFAULT_API_BASE,
        [ENV_VAR_NAMES.LOG_LEVEL]: serverConfig.logLevel ?? DEFAULT_LOG_LEVEL,
        [ENV_VAR_NAMES.REQUEST_TIMEOUT]: String(
          serverConfig.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT
        ),
      },
    };

    // Записать конфигурацию
    await this.writeConfig(config);
  }

  /**
   * Отключить MCP сервер
   */
  async disconnect(): Promise<void> {
    const configPath = this.getConfigPath();

    if (!(await FileManager.exists(configPath))) {
      return; // Ничего не делаем, если файла нет
    }

    const config = await this.readConfig();
    const serverKey = this.getServerKey();
    const servers = config[serverKey];

    if (servers?.[MCP_SERVER_NAME]) {
      // Type assertion needed for generic type modification
       
      delete (servers as Record<string, unknown>)[MCP_SERVER_NAME];
      await this.writeConfig(config);
    }
  }

  /**
   * Прочитать конфигурацию из файла
   */
  private async readConfig(): Promise<MCPClientConfig<TKey>> {
    const configPath = this.getConfigPath();
    const format = this.getConfigFormat();

    if (format === 'json') {
      return FileManager.readJSON<MCPClientConfig<TKey>>(configPath);
    } else {
      return FileManager.readTOML<MCPClientConfig<TKey>>(configPath);
    }
  }

  /**
   * Записать конфигурацию в файл
   */
  private async writeConfig(config: MCPClientConfig<TKey>): Promise<void> {
    const configPath = this.getConfigPath();
    const format = this.getConfigFormat();

    if (format === 'json') {
      await FileManager.writeJSON(configPath, config);
    } else {
      await FileManager.writeTOML(configPath, config);
    }
  }

  /**
   * Создать дефолтную конфигурацию
   */
  private createDefaultConfig(): MCPClientConfig<TKey> {
    const serverKey = this.getServerKey();
    return { [serverKey]: {} } as MCPClientConfig<TKey>;
  }
}
