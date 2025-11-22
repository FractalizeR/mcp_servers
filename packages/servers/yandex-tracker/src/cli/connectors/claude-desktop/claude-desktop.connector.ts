/**
 * Коннектор для Claude Desktop
 */

import * as os from 'os';
import * as path from 'path';
import { FileBasedConnector } from '../base/file-based-connector.js';
import type { MCPClientInfo } from '../base/connector.interface.js';

export class ClaudeDesktopConnector extends FileBasedConnector<'mcpServers', 'json'> {
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

  protected getConfigPath(): string {
    return this.configPath;
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
}
