/**
 * Реестр MCP коннекторов
 */

import type { MCPConnector } from './base/connector.interface.js';
import type { ConnectionStatus, IConnectorRegistry } from '../types.js';

/**
 * Реестр MCP коннекторов.
 * Управляет коллекцией доступных коннекторов и предоставляет методы для работы с ними.
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry();
 * registry.register(createConnector('claude-desktop', 'my-server'));
 * registry.register(new ClaudeCodeConnector('my-server'));
 *
 * const installed = await registry.findInstalled();
 * const claudeDesktop = registry.get('claude-desktop');
 * ```
 */
export class ConnectorRegistry implements IConnectorRegistry {
  private connectors: Map<string, MCPConnector> = new Map();

  /**
   * Зарегистрировать коннектор.
   */
  register(connector: MCPConnector): void {
    const info = connector.getClientInfo();
    this.connectors.set(info.name, connector);
  }

  /**
   * Получить коннектор по имени.
   */
  get(name: string): MCPConnector | undefined {
    return this.connectors.get(name);
  }

  /**
   * Получить все зарегистрированные коннекторы.
   */
  getAll(): MCPConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Найти установленные клиенты.
   * Проверка `isInstalled()` выполняется параллельно.
   */
  async findInstalled(): Promise<MCPConnector[]> {
    const all = Array.from(this.connectors.values());
    const checks = await Promise.all(all.map(async (c) => ({ c, ok: await c.isInstalled() })));
    return checks.filter((x) => x.ok).map((x) => x.c);
  }

  /**
   * Проверить статус всех клиентов параллельно через `Promise.allSettled`.
   *
   * Возвращает Map с именем клиента и его статусом. При ошибке `getStatus()`
   * для конкретного коннектора — записывается `connected: false` с сообщением
   * об ошибке (не пробрасывается, чтобы не падать на одном проблемном клиенте).
   */
  async checkAllStatuses(): Promise<Map<string, ConnectionStatus>> {
    const entries = Array.from(this.connectors.entries());
    const settled = await Promise.allSettled(entries.map(([, c]) => c.getStatus()));

    const result = new Map<string, ConnectionStatus>();
    settled.forEach((res, i) => {
      const name = entries[i]?.[0];
      if (name === undefined) return;
      if (res.status === 'fulfilled') {
        result.set(name, res.value);
      } else {
        const reason = res.reason as unknown;
        const message = reason instanceof Error ? reason.message : String(reason);
        result.set(name, { connected: false, error: `Ошибка проверки статуса: ${message}` });
      }
    });
    return result;
  }
}
