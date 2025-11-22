/**
 * Коннектор для Gemini CLI
 */

import * as os from 'os';
import * as path from 'path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { MCPClientInfo } from '../base/connector.interface.js';

export class GeminiConnector extends FileBasedConnector<'mcpServers', 'json'> {
  private readonly configPath: string;

  constructor() {
    super();
    // Gemini CLI хранит конфигурацию в ~/.gemini/settings.json
    this.configPath = path.join(os.homedir(), '.gemini/settings.json');
  }

  protected getConfigPath(): string {
    return this.configPath;
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'gemini',
      displayName: 'Gemini CLI',
      description: 'Gemini CLI для разработки с MCP серверами',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }
}
