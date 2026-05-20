import type { MCPConnector } from '../connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../connectors/registry.js';
import type { ConnectionStatus } from '../types.js';
import { Logger } from '../utils/logger.js';

/**
 * Опции для команды status
 */
export interface StatusCommandOptions {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry;
}

/**
 * Отобразить детали подключения
 */
function displayConnectionDetails(status: ConnectionStatus): void {
  if (!status.details) return;

  Logger.info(`  └─ Конфиг: ${status.details.configPath}`);
  if (status.details.scope) {
    Logger.info(`  └─ Scope: ${status.details.scope}`);
  }
  if (status.details.lastModified) {
    Logger.info(`  └─ Изменен: ${status.details.lastModified.toLocaleString()}`);
  }
}

/**
 * Отобразить статус одного коннектора
 */
async function displayConnectorStatus(
  connector: MCPConnector,
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
    if (status.error) {
      Logger.warn(`  └─ ${status.error}`);
    }
  } else if (status.error) {
    Logger.error(`${info.displayName}: ❗ Ошибка`);
    Logger.error(`  └─ ${status.error}`);
  } else {
    Logger.warn(`${info.displayName}: ⭕ Не подключен`);
  }
}

/**
 * Команда для отображения статуса всех MCP подключений.
 *
 * Сбор статусов выполняется параллельно через {@link ConnectorRegistry.checkAllStatuses},
 * рендеринг — последовательно в детерминированном порядке регистрации.
 */
export async function statusCommand(options: StatusCommandOptions): Promise<void> {
  const { registry } = options;

  Logger.header('📊 Статус MCP подключений');
  Logger.newLine();

  const statuses = await registry.checkAllStatuses();
  const connectors = registry.getAll();

  if (statuses.size === 0) {
    Logger.warn('Нет зарегистрированных MCP клиентов');
    Logger.newLine();
    return;
  }

  for (const connector of connectors) {
    const name = connector.getClientInfo().name;
    const status = statuses.get(name);
    if (!status) continue;
    await displayConnectorStatus(connector, status);
  }

  Logger.newLine();
}
