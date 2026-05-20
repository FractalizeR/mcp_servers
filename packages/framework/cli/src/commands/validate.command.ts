import type { ConnectorRegistry } from '../connectors/registry.js';
import { Logger } from '../utils/logger.js';

/**
 * Опции для команды validate
 */
export interface ValidateCommandOptions {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry;
}

/**
 * Команда для валидации конфигураций MCP клиентов.
 * Проверяет корректность всех подключенных конфигураций.
 * Завершается с кодом 1 если обнаружены ошибки.
 *
 * @example
 * ```typescript
 * await validateCommand({ registry });
 * ```
 */
export async function validateCommand(options: ValidateCommandOptions): Promise<void> {
  const { registry } = options;

  Logger.header('🔍 Валидация конфигураций MCP клиентов');

  const spinner = Logger.spinner('Проверка конфигураций...');
  const statuses = await registry.checkAllStatuses();
  spinner.stop();

  let hasErrors = false;
  let connectedCount = 0;

  // Детерминированный порядок: по списку getAll()
  for (const connector of registry.getAll()) {
    const name = connector.getClientInfo().name;
    const status = statuses.get(name);
    if (!status) continue;

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
    } else if (status.error) {
      Logger.error(`${info.displayName}: ошибка в конфигурации`);
      Logger.error(`  ${status.error}`);
      hasErrors = true;
    } else {
      Logger.info(`${info.displayName}: не подключен`);
    }
  }

  Logger.newLine();
  Logger.info(
    `Итого: ${String(connectedCount)} валидных конфигураций из ${String(statuses.size)} проверенных`
  );

  if (hasErrors) {
    process.exit(1);
  }
}
