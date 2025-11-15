/**
 * Коннектор для Claude Code
 */

import * as path from 'path';
import { BaseConnector } from '../base/base-connector.js';
import type {
  MCPClientInfo,
  MCPServerConfig,
  ConnectionStatus,
} from '../base/connector.interface.js';
import { CommandExecutor } from '../../utils/command-executor.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '../../../src/constants.js';

export class ClaudeCodeConnector extends BaseConnector {
  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-code',
      displayName: 'Claude Code',
      description: 'CLI инструмент Claude Code для разработки',
      checkCommand: 'claude --version',
      configPath: 'managed-by-cli',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    return CommandExecutor.isCommandAvailable('claude');
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      const output = CommandExecutor.exec('claude mcp list');
      const connected = output.includes(MCP_SERVER_NAME);

      if (connected) {
        return {
          connected,
          details: {
            configPath: 'managed by claude mcp',
          },
        };
      }

      return { connected };
    } catch (error) {
      return {
        connected: false,
        error: `Ошибка проверки статуса: ${(error as Error).message}`,
      };
    }
  }

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    const args = [
      'mcp',
      'add',
      '--transport',
      'stdio',
      MCP_SERVER_NAME,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=${serverConfig.token}`,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_ORG_ID}=${serverConfig.orgId}`,
      '--env',
      `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${serverConfig.apiBase || DEFAULT_API_BASE}`,
      '--env',
      `${ENV_VAR_NAMES.LOG_LEVEL}=${serverConfig.logLevel || DEFAULT_LOG_LEVEL}`,
      '--env',
      `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${serverConfig.requestTimeout || DEFAULT_REQUEST_TIMEOUT}`,
      '--',
      'node',
      path.join(serverConfig.projectPath, SERVER_ENTRY_POINT),
    ];

    await CommandExecutor.execInteractive('claude', args);
  }

  async disconnect(): Promise<void> {
    await CommandExecutor.execInteractive('claude', ['mcp', 'remove', MCP_SERVER_NAME]);
  }
}
