/**
 * Коннектор для Claude Desktop
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
} from '../../../constants.js';

interface ClaudeDesktopConfig {
  mcpServers?: Record<
    string,
    {
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  >;
}

export class ClaudeDesktopConnector extends BaseConnector {
  private readonly configPath: string;

  constructor() {
    super();

    const platform = os.platform();
    if (platform === 'darwin') {
      this.configPath = path.join(
        os.homedir(),
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
    } else if (platform === 'linux') {
      this.configPath = path.join(os.homedir(), '.config/claude/claude_desktop_config.json');
    } else {
      // Windows
      this.configPath = path.join(
        process.env['APPDATA'] ?? '',
        'Claude/claude_desktop_config.json'
      );
    }
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      description: 'Официальное десктопное приложение Claude от Anthropic',
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

      const config = await FileManager.readJSON<ClaudeDesktopConfig>(this.configPath);

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
        error: `Ошибка чтения конфига: ${(error as Error).message}`,
      };
    }
  }

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    // Создать директорию если не существует
    const configDir = path.dirname(this.configPath);
    await FileManager.ensureDir(configDir);

    // Прочитать существующую конфигурацию или создать новую
    let config: ClaudeDesktopConfig;
    if (await FileManager.exists(this.configPath)) {
      config = await FileManager.readJSON<ClaudeDesktopConfig>(this.configPath);
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

    const config = await FileManager.readJSON<ClaudeDesktopConfig>(this.configPath);

    if (config.mcpServers?.[MCP_SERVER_NAME]) {
      delete config.mcpServers[MCP_SERVER_NAME];
      await FileManager.writeJSON(this.configPath, config);
    }
  }
}
