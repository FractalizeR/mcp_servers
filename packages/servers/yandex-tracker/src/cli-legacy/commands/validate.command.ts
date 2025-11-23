/**
 * Команда валидации конфигураций MCP клиентов
 */

import { ConnectorRegistry } from '../connectors/registry.js';
import { Logger } from '../utils/logger.js';

export async function validateCommand(): Promise<void> {
  const registry = new ConnectorRegistry();

  Logger.header('🔍 Валидация конфигураций MCP клиентов');

  const spinner = Logger.spinner('Проверка конфигураций...');
  const statuses = await registry.checkAllStatuses();
  spinner.stop();

  let hasErrors = false;
  let connectedCount = 0;

  for (const [name, status] of statuses.entries()) {
    const connector = registry.get(name);
    if (!connector) continue;

    const info = connector.getClientInfo();
    const isInstalled = await connector.isInstalled();

    if (!isInstalled) {
      Logger.warn(`${info.displayName}: клиент не установлен`);
      continue;
    }

    if (status.connected) {
      connectedCount++;
      Logger.success(`${info.displayName}: конфигурация валидна`);
      if (status.details?.configPath) {
        Logger.info(`  Файл: ${status.details.configPath}`);
      }
    } else {
      if (status.error) {
        Logger.error(`${info.displayName}: ошибка в конфигурации`);
        Logger.error(`  ${status.error}`);
        hasErrors = true;
      } else {
        Logger.info(`${info.displayName}: не подключен`);
      }
    }
  }

  Logger.newLine();
  Logger.info(`Итого: ${connectedCount} валидных конфигураций из ${statuses.size} проверенных`);

  if (hasErrors) {
    process.exit(1);
  }
}
