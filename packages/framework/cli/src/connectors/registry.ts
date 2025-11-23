/**
 * Реестр MCP коннекторов
 */

import type { MCPConnector } from './base/connector.interface.js';
import type { BaseMCPServerConfig, ConnectionStatus, IConnectorRegistry } from '../types.js';

/**
 * Реестр MCP коннекторов
 * Управляет коллекцией доступных коннекторов и предоставляет методы для работы с ними
 *
 * @template TConfig - Тип конфигурации MCP сервера
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry<MyServerConfig>();
 * registry.register(new ClaudeDesktopConnector('my-server', 'dist/index.js'));
 * registry.register(new ClaudeCodeConnector('my-server', 'dist/index.js'));
 *
 * const installed = await registry.findInstalled();
 * const claudeDesktop = registry.get('claude-desktop');
 * ```
 */
export class ConnectorRegistry<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig>
  implements IConnectorRegistry<TConfig>
{
  private connectors: Map<string, MCPConnector<TConfig>> = new Map();

  /**
   * Зарегистрировать коннектор
   * @param connector - Коннектор для регистрации
   */
  register(connector: MCPConnector<TConfig>): void {
    const info = connector.getClientInfo();
    this.connectors.set(info.name, connector);
  }

  /**
   * Получить коннектор по имени
   * @param name - Имя клиента (например, 'claude-desktop')
   * @returns Коннектор или undefined если не найден
   */
  get(name: string): MCPConnector<TConfig> | undefined {
    return this.connectors.get(name);
  }

  /**
   * Получить все зарегистрированные коннекторы
   * @returns Массив всех коннекторов
   */
  getAll(): MCPConnector<TConfig>[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Найти установленные клиенты
   * Проверяет каждый коннектор на наличие в системе
   *
   * @returns Массив установленных коннекторов
   */
  async findInstalled(): Promise<MCPConnector<TConfig>[]> {
    const installed: MCPConnector<TConfig>[] = [];

    for (const connector of this.connectors.values()) {
      if (await connector.isInstalled()) {
        installed.push(connector);
      }
    }

    return installed;
  }

  /**
   * Проверить статус всех клиентов
   * Возвращает Map с именем клиента и его статусом
   *
   * @returns Map<имя клиента, статус подключения>
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
