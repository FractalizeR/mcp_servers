/**
 * Управление сохраненной конфигурацией MCP сервера
 */

import * as path from 'path';
import type { MCPServerConfig } from '../connectors/base/connector.interface.js';
import { FileManager } from './file-manager.js';
import { PROJECT_BASE_NAME } from '../../constants.js';

const CONFIG_DIR = `.${PROJECT_BASE_NAME}`;
const CONFIG_FILE = 'config.json';

export class ConfigManager {
  private readonly configPath: string;

  constructor() {
    const homeDir = FileManager.getHomeDir();
    this.configPath = path.join(homeDir, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * Загрузить сохраненную конфигурацию
   */
  async load(): Promise<Partial<MCPServerConfig> | undefined> {
    try {
      if (!(await FileManager.exists(this.configPath))) {
        return undefined;
      }

      return await FileManager.readJSON<Partial<MCPServerConfig>>(this.configPath);
    } catch {
      return undefined;
    }
  }

  /**
   * Сохранить конфигурацию
   */
  async save(config: MCPServerConfig): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await FileManager.ensureDir(configDir);

    // Сохраняем только безопасные поля (без токена)
    const safeConfig: Partial<MCPServerConfig> = {
      orgId: config.orgId,
      projectPath: config.projectPath,
    };

    if (config.apiBase) {
      safeConfig.apiBase = config.apiBase;
    }
    if (config.logLevel) {
      safeConfig.logLevel = config.logLevel;
    }
    if (config.requestTimeout) {
      safeConfig.requestTimeout = config.requestTimeout;
    }

    await FileManager.writeJSON(this.configPath, safeConfig);

    // Устанавливаем права доступа 0600 (только владелец может читать/писать)
    await FileManager.setPermissions(this.configPath, 0o600);
  }

  /**
   * Удалить сохраненную конфигурацию
   */
  async delete(): Promise<void> {
    if (await FileManager.exists(this.configPath)) {
      const fs = await import('fs/promises');
      await fs.unlink(this.configPath);
    }
  }

  /**
   * Проверить существование сохраненной конфигурации
   */
  async exists(): Promise<boolean> {
    return FileManager.exists(this.configPath);
  }
}
