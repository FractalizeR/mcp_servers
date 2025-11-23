/**
 * Коннектор для Qwen Code
 */

import * as os from 'os';
import * as path from 'path';
import { BaseConnector } from '../base/base-connector.js';
import type {
  MCPClientInfo,
  MCPServerConfig,
  ConnectionStatus,
} from '../base/connector.interface.js';
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

interface QwenConfig {
  mcpServers?: Record<
    string,
    {
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  >;
}

export class QwenConnector extends BaseConnector {
  private readonly configPath: string;

  constructor() {
    super();

    // Qwen Code хранит конфигурацию в ~/.qwen/settings.json
    this.configPath = path.join(os.homedir(), '.qwen/settings.json');
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'qwen',
      displayName: 'Qwen Code',
      description: 'Qwen Code для разработки с MCP серверами',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    const configDir = path.dirname(this.configPath);
    return FileManager.exists(configDir);
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      if (!(await FileManager.exists(this.configPath))) {
        return { connected: false, error: 'Конфигурационный файл не найден' };
      }

      const config = await FileManager.readJSON<QwenConfig>(this.configPath);

      if (config.mcpServers?.[MCP_SERVER_NAME]) {
        return {
          connected: true,
          details: {
            configPath: this.configPath,
            metadata: { serverConfig: config.mcpServers[MCP_SERVER_NAME] },
          },
        };
      }

      return { connected: false };
    } catch (error) {
      return {
        connected: false,
        error: `Ошибка чтения конфига: ${isError(error) ? error.message : String(error)}`,
      };
    }
  }

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    // Создать директорию если не существует
    const configDir = path.dirname(this.configPath);
    await FileManager.ensureDir(configDir);

    // Прочитать существующую конфигурацию или создать новую
    let config: QwenConfig;
    if (await FileManager.exists(this.configPath)) {
      config = await FileManager.readJSON<QwenConfig>(this.configPath);
    } else {
      config = { mcpServers: {} };
    }

    // Добавить/обновить MCP сервер
    config.mcpServers ??= {};
    config.mcpServers[MCP_SERVER_NAME] = {
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
    await FileManager.writeJSON(this.configPath, config);
  }

  async disconnect(): Promise<void> {
    if (!(await FileManager.exists(this.configPath))) {
      return; // Ничего не делаем, если файла нет
    }

    const config = await FileManager.readJSON<QwenConfig>(this.configPath);

    if (config.mcpServers?.[MCP_SERVER_NAME]) {
      delete config.mcpServers[MCP_SERVER_NAME];
      await FileManager.writeJSON(this.configPath, config);
    }
  }
}
