/**
 * Коннектор для Codex
 */

import * as os from 'os';
import * as path from 'path';
import { BaseConnector } from '../base/base-connector.js';
import type {
  MCPClientInfo,
  MCPServerConfig,
  ConnectionStatus,
} from '../base/connector.interface.js';
import { CommandExecutor } from '../../utils/command-executor.js';
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

interface CodexConfig {
  mcp_servers?: Record<
    string,
    {
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  >;
}

export class CodexConnector extends BaseConnector {
  private readonly configPath: string;

  constructor() {
    super();
    this.configPath = path.join(os.homedir(), '.codex/config.toml');
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'codex',
      displayName: 'Codex',
      description: 'CLI инструмент Codex от OpenAI',
      checkCommand: 'codex --version',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  isInstalled(): Promise<boolean> {
    return Promise.resolve(CommandExecutor.isCommandAvailable('codex'));
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      if (!(await FileManager.exists(this.configPath))) {
        return { connected: false };
      }

      const config = await FileManager.readTOML<CodexConfig>(this.configPath);

      if (config.mcp_servers?.[MCP_SERVER_NAME]) {
        return {
          connected: true,
          details: {
            configPath: this.configPath,
            metadata: { serverConfig: config.mcp_servers[MCP_SERVER_NAME] },
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
    const args = [
      'mcp',
      'add',
      MCP_SERVER_NAME,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=${serverConfig.token}`,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_ORG_ID}=${serverConfig.orgId}`,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${serverConfig.apiBase ?? DEFAULT_API_BASE}`,
      '--env',
      `${ENV_VAR_NAMES.LOG_LEVEL}=${serverConfig.logLevel ?? DEFAULT_LOG_LEVEL}`,
      '--env',
      `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${serverConfig.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT}`,
      '--',
      'node',
      path.join(serverConfig.projectPath, SERVER_ENTRY_POINT),
    ];

    await CommandExecutor.execInteractive('codex', args);
  }

  async disconnect(): Promise<void> {
    // Codex может не иметь команды remove, поэтому удаляем из TOML
    if (!(await FileManager.exists(this.configPath))) {
      return;
    }

    const config = await FileManager.readTOML<CodexConfig>(this.configPath);

    if (config.mcp_servers?.[MCP_SERVER_NAME]) {
      delete config.mcp_servers[MCP_SERVER_NAME];
      await FileManager.writeTOML(this.configPath, config);
    }
  }
}
