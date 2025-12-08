/**
 * Коннектор для Qwen Code
 *
 * @deprecated Используйте `createConnector('qwen', serverName, entryPoint)` из connector-factory.ts
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo } from '../../types.js';

/**
 * Коннектор для Qwen Code
 * Qwen Code хранит конфигурацию в ~/.qwen/settings.json
 *
 * @deprecated Используйте `createConnector('qwen', serverName, entryPoint)` из connector-factory.ts
 * @template TConfig - Тип конфигурации MCP сервера
 */
export class QwenConnector<
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
    this.configPath = path.join(os.homedir(), '.qwen/settings.json');
  }

  /**
   * Получить информацию о клиенте
   */
  getClientInfo(): MCPClientInfo {
    return {
      name: 'qwen',
      displayName: 'Qwen Code',
      description: 'Qwen Code для разработки с MCP серверами',
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
