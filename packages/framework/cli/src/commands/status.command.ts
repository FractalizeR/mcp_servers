import type { MCPConnector } from '../connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../connectors/registry.js';
import type { BaseMCPServerConfig, ConnectionStatus } from '../types.js';
import { Logger } from '../utils/logger.js';

/**
 * Опции для команды status
 */
export interface StatusCommandOptions<TConfig extends BaseMCPServerConfig> {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry<TConfig>;
}

/**
 * Отобразить детали подключения
 */
function displayConnectionDetails(status: ConnectionStatus): void {
  if (!status.details) return;

  Logger.info(`  └─ Конфиг: ${status.details.configPath}`);
  if (status.details.lastModified) {
    Logger.info(`  └─ Изменен: ${status.details.lastModified.toLocaleString()}`);
  }
}

/**
 * Отобразить статус одного коннектора
 */
async function displayConnectorStatus<TConfig extends BaseMCPServerConfig>(
  connector: MCPConnector<TConfig>,
  status: ConnectionStatus
): Promise<void> {
  const info = connector.getClientInfo();
  const isInstalled = await connector.isInstalled();

  if (!isInstalled) {
    Logger.info(`${info.displayName}: ❌ Не установлен`);
    return;
  }

  if (status.connected) {
    Logger.success(`${info.displayName}: ✅ Подключен`);
    displayConnectionDetails(status);
  } else {
    Logger.warn(`${info.displayName}: ⭕ Не подключен`);
  }
}

/**
 * Команда для отображения статуса всех MCP подключений
 *
 * @param options - Опции команды
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry<YourConfig>();
 * // регистрация коннекторов...
 * await statusCommand({ registry });
 * ```
 */
export async function statusCommand<TConfig extends BaseMCPServerConfig>(
  options: StatusCommandOptions<TConfig>
): Promise<void> {
  const { registry } = options;

  Logger.header('📊 Статус MCP подключений');
  Logger.newLine();

  const statuses = await registry.checkAllStatuses();

  if (statuses.size === 0) {
    Logger.warn('Нет зарегистрированных MCP клиентов');
    Logger.newLine();
    return;
  }

  for (const [name, status] of statuses) {
    const connector = registry.get(name);
    if (!connector) continue;

    await displayConnectorStatus(connector, status);
  }

  Logger.newLine();
}
