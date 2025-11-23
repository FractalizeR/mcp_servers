/**
 * Коннектор для Claude Desktop
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo } from '../../types.js';

/**
 * Коннектор для Claude Desktop приложения
 * Поддерживает macOS, Linux и Windows
 *
 * @template TConfig - Тип конфигурации MCP сервера
 */
export class ClaudeDesktopConnector<
  TConfig extends BaseMCPServerConfig = BaseMCPServerConfig,
> extends FileBasedConnector<TConfig, 'mcpServers', 'json'> {
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

  /**
   * Получить информацию о клиенте
   */
  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      description: 'Официальное десктопное приложение Claude от Anthropic',
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
}
