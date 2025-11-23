/**
 * Базовый класс для file-based MCP коннекторов (JSON/TOML конфигурации)
 */

import * as path from 'node:path';
import { BaseConnector } from './base-connector.js';
import type {
  BaseMCPServerConfig,
  ConnectionStatus,
  MCPClientConfig,
  MCPClientServerConfig,
} from '../../types.js';
import { FileManager } from '../../utils/file-manager.js';

/**
 * Формат конфигурационного файла
 */
export type ConfigFormat = 'json' | 'toml';

/**
 * Type guard для проверки Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Базовый класс для connectors, работающих с файлами конфигурации
 *
 * @template TConfig - Тип конфигурации MCP сервера
 * @template TKey - Ключ для серверов в конфиге ('mcpServers', 'mcp_servers' и т.д.)
 * @template TFormat - Формат файла ('json' или 'toml')
 *
 * @example
 * ```typescript
 * // JSON connector с ключом mcpServers
 * class MyConnector extends FileBasedConnector<MyServerConfig, 'mcpServers', 'json'> {
 *   protected getConfigPath(): string {
 *     return path.join(os.homedir(), '.my-client/config.json');
 *   }
 * }
 *
 * // TOML connector с ключом mcp_servers
 * class MyTOMLConnector extends FileBasedConnector<MyServerConfig, 'mcp_servers', 'toml'> {
 *   protected getConfigPath(): string {
 *     return path.join(os.homedir(), '.my-client/config.toml');
 *   }
 * }
 * ```
 */
export abstract class FileBasedConnector<
  TConfig extends BaseMCPServerConfig = BaseMCPServerConfig,
  TKey extends string = 'mcpServers',
  TFormat extends ConfigFormat = 'json',
> extends BaseConnector<TConfig> {
  /**
   * Получить путь к конфигурационному файлу
   * Должен быть реализован в подклассе
   */
  protected abstract getConfigPath(): string;

  /**
   * Получить имя MCP сервера для записи в конфигурацию
   * Должен быть реализован в подклассе
   */
  protected abstract getServerName(): string;

  /**
   * Получить относительный путь к точке входа сервера от projectPath
   * Должен быть реализован в подклассе
   */
  protected abstract getEntryPoint(): string;

  /**
   * Получить команду для запуска сервера
   * По умолчанию 'node', можно переопределить
   */
  protected getCommand(): string {
    return 'node';
  }

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
      const serverName = this.getServerName();

      if (servers?.[serverName]) {
        return {
          connected: true,
          details: {
            configPath,
            metadata: { serverConfig: servers[serverName] },
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
   *
   * @param serverConfig - Конфигурация сервера (должна содержать env с переменными окружения)
   */
  async connect(serverConfig: TConfig): Promise<void> {
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
    const serverName = this.getServerName();
    const entryPoint = this.getEntryPoint();
    const command = this.getCommand();

    servers[serverName] = {
      command,
      args: [path.join(serverConfig.projectPath, entryPoint)],
      env: serverConfig.env ?? {},
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
    const serverName = this.getServerName();

    if (servers?.[serverName]) {
      // Type assertion needed for generic type modification
      delete (servers as Record<string, unknown>)[serverName];
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
