/**
 * Коннектор для Codex
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo } from '../../types.js';

/**
 * Коннектор для Codex CLI от OpenAI
 * Codex использует TOML конфигурацию в ~/.codex/config.toml
 *
 * @template TConfig - Тип конфигурации MCP сервера
 */
export class CodexConnector<
  TConfig extends BaseMCPServerConfig = BaseMCPServerConfig,
> extends FileBasedConnector<TConfig, 'mcp_servers', 'toml'> {
  private readonly configPath: string;
  private readonly serverName: string;
  private readonly entryPoint: string;

  /**
   * @param serverName - Имя MCP сервера для записи в конфигурацию
   * @param entryPoint - Относительный путь к точке входа сервера от projectPath
   */
  constructor(serverName: string, entryPoint: string) {
    super();
    this.serverName = serverName;
    this.entryPoint = entryPoint;
    this.configPath = path.join(os.homedir(), '.codex/config.toml');
  }

  /**
   * Получить информацию о клиенте
   */
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

  /**
   * Получить путь к конфигурационному файлу
   */
  protected getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Получить имя MCP сервера
   */
  protected getServerName(): string {
    return this.serverName;
  }

  /**
   * Получить точку входа сервера
   */
  protected getEntryPoint(): string {
    return this.entryPoint;
  }

  /**
   * Получить ключ для серверов в конфиге
   * Codex использует 'mcp_servers' вместо 'mcpServers'
   */
  protected override getServerKey(): 'mcp_servers' {
    return 'mcp_servers';
  }

  /**
   * Получить формат файла
   * Codex использует TOML формат
   */
  protected override getConfigFormat(): 'toml' {
    return 'toml';
  }
}
