/**
 * Коннектор для Qwen Code
 */

import * as os from 'os';
import * as path from 'path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { MCPClientInfo } from '../base/connector.interface.js';

export class QwenConnector extends FileBasedConnector<'mcpServers', 'json'> {
  private readonly configPath: string;

  constructor() {
    super();
    // Qwen Code хранит конфигурацию в ~/.qwen/settings.json
    this.configPath = path.join(os.homedir(), '.qwen/settings.json');
  }

  protected getConfigPath(): string {
    return this.configPath;
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
}
