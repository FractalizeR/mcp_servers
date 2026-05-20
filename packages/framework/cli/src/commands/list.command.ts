import type { ConnectorRegistry } from '../connectors/registry.js';
import { Logger } from '../utils/logger.js';

/**
 * Опции для команды list
 */
export interface ListCommandOptions {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry;
}

/**
 * Команда для отображения списка всех поддерживаемых MCP клиентов.
 *
 * @example
 * ```typescript
 * await listCommand({ registry });
 * ```
 */
export async function listCommand(options: ListCommandOptions): Promise<void> {
  const { registry } = options;

  Logger.header('📋 Поддерживаемые MCP клиенты');
  Logger.newLine();

  const connectors = registry.getAll();

  if (connectors.length === 0) {
    Logger.warn('Нет зарегистрированных MCP клиентов');
    Logger.newLine();
    return;
  }

  for (const connector of connectors) {
    const info = connector.getClientInfo();
    const isInstalled = await connector.isInstalled();

    Logger.info(`• ${info.displayName}`);
    Logger.info(`  └─ ${info.description}`);
    Logger.info(`  └─ Платформы: ${info.platforms.join(', ')}`);
    Logger.info(`  └─ Статус: ${isInstalled ? '✅ Установлен' : '❌ Не установлен'}`);
    Logger.newLine();
  }
}
