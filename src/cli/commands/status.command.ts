/**
 * Команда проверки статуса подключений
 */

import { ConnectorRegistry } from '../connectors/registry.js';
import { Logger } from '../utils/logger.js';

export async function statusCommand(): Promise<void> {
  const registry = new ConnectorRegistry();

  Logger.header('📊 Статус подключений MCP сервера');

  const spinner = Logger.spinner('Проверка статуса...');
  const statuses = await registry.checkAllStatuses();
  spinner.stop();

  for (const [name, status] of statuses.entries()) {
    const connector = registry.get(name);
    if (!connector) continue;

    const info = connector.getClientInfo();
    const isInstalled = await connector.isInstalled();

    if (!isInstalled) {
      Logger.warn(`${info.displayName}: не установлен`);
      continue;
    }

    if (status.connected) {
      Logger.success(`${info.displayName}: подключен`);
      if (status.details) {
        Logger.info(`  Конфигурация: ${status.details.configPath}`);
      }
    } else {
      Logger.info(`${info.displayName}: не подключен`);
      if (status.error) {
        Logger.error(`  Ошибка: ${status.error}`);
      }
    }
  }
}
