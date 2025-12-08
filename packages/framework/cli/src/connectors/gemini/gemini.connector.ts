/**
 * Коннектор для Gemini CLI
 *
 * @deprecated Используйте `createConnector('gemini', serverName, entryPoint)` из connector-factory.ts
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo } from '../../types.js';

/**
 * Коннектор для Gemini CLI
 * Gemini CLI хранит конфигурацию в ~/.gemini/settings.json
 *
 * @deprecated Используйте `createConnector('gemini', serverName, entryPoint)` из connector-factory.ts
 * @template TConfig - Тип конфигурации MCP сервера
 */
export class GeminiConnector<
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
    this.configPath = path.join(os.homedir(), '.gemini/settings.json');
  }

  /**
   * Получить информацию о клиенте
   */
  getClientInfo(): MCPClientInfo {
    return {
      name: 'gemini',
      displayName: 'Gemini CLI',
      description: 'Gemini CLI для разработки с MCP серверами',
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
