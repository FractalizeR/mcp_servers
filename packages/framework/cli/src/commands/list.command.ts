import type { ConnectorRegistry } from '../connectors/registry.js';
import type { BaseMCPServerConfig } from '../types.js';
import { Logger } from '../utils/logger.js';

/**
 * Опции для команды list
 */
export interface ListCommandOptions<TConfig extends BaseMCPServerConfig> {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry<TConfig>;
}

/**
 * Команда для отображения списка всех поддерживаемых MCP клиентов
 *
 * @param options - Опции команды
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry<YourConfig>();
 * // регистрация коннекторов...
 * await listCommand({ registry });
 * ```
 */
export async function listCommand<TConfig extends BaseMCPServerConfig>(
  options: ListCommandOptions<TConfig>
): Promise<void> {
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
