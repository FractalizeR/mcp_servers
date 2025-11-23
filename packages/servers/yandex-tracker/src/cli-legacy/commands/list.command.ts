/**
 * Команда списка поддерживаемых клиентов
 */

import { ConnectorRegistry } from '../connectors/registry.js';
import { Logger } from '../utils/logger.js';

export async function listCommand(): Promise<void> {
  const registry = new ConnectorRegistry();

  Logger.header('📋 Поддерживаемые MCP клиенты');

  const allConnectors = registry.getAll();

  for (const connector of allConnectors) {
    const info = connector.getClientInfo();
    const isInstalled = await connector.isInstalled();

    if (isInstalled) {
      Logger.success(`${info.displayName} (установлен)`);
    } else {
      Logger.warn(`${info.displayName} (не установлен)`);
    }

    Logger.info(`  ${info.description}`);
    if (info.checkCommand) {
      Logger.info(`  Проверка: ${info.checkCommand}`);
    }
    Logger.newLine();
  }
}
