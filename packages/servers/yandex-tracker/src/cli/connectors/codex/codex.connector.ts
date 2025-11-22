/**
 * Коннектор для Codex
 */

import * as os from 'os';
import * as path from 'path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { MCPClientInfo, MCPServerConfig } from '../base/connector.interface.js';
import { CommandExecutor } from '../../utils/command-executor.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '#constants';

export class CodexConnector extends FileBasedConnector<'mcp_servers', 'toml'> {
  private readonly configPath: string;

  constructor() {
    super();
    this.configPath = path.join(os.homedir(), '.codex/config.toml');
  }

  protected override getConfigPath(): string {
    return this.configPath;
  }

  protected override getServerKey(): 'mcp_servers' {
    return 'mcp_servers';
  }

  protected override getConfigFormat(): 'toml' {
    return 'toml';
  }

  override getClientInfo(): MCPClientInfo {
    return {
      name: 'codex',
      displayName: 'Codex',
      description: 'CLI инструмент Codex от OpenAI',
      checkCommand: 'codex --version',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  override async isInstalled(): Promise<boolean> {
    return Promise.resolve(CommandExecutor.isCommandAvailable('codex'));
  }

  /**
   * Переопределяем connect для использования CLI команды
   */
  override async connect(serverConfig: MCPServerConfig): Promise<void> {
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
}
