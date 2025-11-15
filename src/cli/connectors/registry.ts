/**
 * Реестр MCP коннекторов
 */

import type { MCPConnector, ConnectionStatus } from './base/connector.interface.js';
import { ClaudeDesktopConnector } from './claude-desktop/claude-desktop.connector.js';
import { ClaudeCodeConnector } from './claude-code/claude-code.connector.js';
import { CodexConnector } from './codex/codex.connector.js';

export class ConnectorRegistry {
  private connectors: Map<string, MCPConnector> = new Map();

  constructor() {
    // Автоматическая регистрация всех коннекторов
    this.register(new ClaudeDesktopConnector());
    this.register(new ClaudeCodeConnector());
    this.register(new CodexConnector());
  }

  /**
   * Зарегистрировать коннектор
   */
  register(connector: MCPConnector): void {
    const info = connector.getClientInfo();
    this.connectors.set(info.name, connector);
  }

  /**
   * Получить коннектор по имени
   */
  get(name: string): MCPConnector | undefined {
    return this.connectors.get(name);
  }

  /**
   * Получить все зарегистрированные коннекторы
   */
  getAll(): MCPConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Найти установленные клиенты
   */
  async findInstalled(): Promise<MCPConnector[]> {
    const installed: MCPConnector[] = [];

    for (const connector of this.connectors.values()) {
      if (await connector.isInstalled()) {
        installed.push(connector);
      }
    }

    return installed;
  }

  /**
   * Проверить статус всех клиентов
   */
  async checkAllStatuses(): Promise<Map<string, ConnectionStatus>> {
    const statuses = new Map<string, ConnectionStatus>();

    for (const [name, connector] of this.connectors) {
      const status = await connector.getStatus();
      statuses.set(name, status);
    }

    return statuses;
  }
}
