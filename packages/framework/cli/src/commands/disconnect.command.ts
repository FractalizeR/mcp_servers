import type { MCPConnector } from '../connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../connectors/registry.js';
import type { BaseMCPServerConfig } from '../types.js';
import { Logger } from '../utils/logger.js';
import { InteractivePrompter } from '../utils/interactive-prompter.js';

/**
 * Опции для команды disconnect
 */
export interface DisconnectCommandOptions<TConfig extends BaseMCPServerConfig> {
  /** Реестр MCP коннекторов */
  registry: ConnectorRegistry<TConfig>;

  /** CLI опции из командной строки */
  cliOptions?: {
    /** Имя клиента для отключения (опционально, если не указан - будет интерактивный выбор) */
    client?: string;
  };
}

/**
 * Найти подключенные коннекторы
 */
async function findConnectedConnectors<TConfig extends BaseMCPServerConfig>(
  registry: ConnectorRegistry<TConfig>
): Promise<Array<MCPConnector<TConfig>>> {
  const statuses = await registry.checkAllStatuses();
  return Array.from(statuses.entries())
    .filter(([_, status]) => status.connected)
    .map(([name]) => registry.get(name))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
}

/**
 * Выбрать коннектор по имени из CLI или интерактивно
 */
async function selectConnector<TConfig extends BaseMCPServerConfig>(
  registry: ConnectorRegistry<TConfig>,
  connectedConnectors: Array<MCPConnector<TConfig>>,
  clientName?: string
): Promise<MCPConnector<TConfig> | undefined> {
  if (clientName) {
    const connector = registry.get(clientName);
    if (!connector) {
      Logger.error(`Клиент "${clientName}" не найден`);
      return undefined;
    }

    const status = await connector.getStatus();
    if (!status.connected) {
      Logger.error(`Клиент "${clientName}" не подключен`);
      return undefined;
    }

    Logger.info(`Выбран клиент: ${connector.getClientInfo().displayName}`);
    return connector;
  }

  const clientInfos = connectedConnectors.map((c) => c.getClientInfo());
  const selectedName = await InteractivePrompter.promptClientSelection(clientInfos);
  return registry.get(selectedName);
}

/**
 * Выполнить отключение коннектора
 */
async function performDisconnect<TConfig extends BaseMCPServerConfig>(
  connector: MCPConnector<TConfig>
): Promise<boolean> {
  const spinner = Logger.spinner(`Отключаю от ${connector.getClientInfo().displayName}...`);

  try {
    await connector.disconnect();
    spinner.succeed(`MCP сервер успешно отключен от ${connector.getClientInfo().displayName}!`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Ошибка отключения: ${errorMessage}`);
    return false;
  }
}

/**
 * Команда для отключения MCP сервера от клиента
 *
 * @param options - Опции команды
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry<YourConfig>();
 * // регистрация коннекторов...
 *
 * // Интерактивный выбор клиента
 * await disconnectCommand({ registry });
 *
 * // Или указать клиент явно
 * await disconnectCommand({
 *   registry,
 *   cliOptions: { client: 'claude-desktop' }
 * });
 * ```
 */
export async function disconnectCommand<TConfig extends BaseMCPServerConfig>(
  options: DisconnectCommandOptions<TConfig>
): Promise<void> {
  const { registry, cliOptions } = options;

  Logger.header('🔌 Отключение MCP сервера');
  Logger.newLine();

  const spinner = Logger.spinner('Поиск подключенных клиентов...');
  const connectedConnectors = await findConnectedConnectors(registry);
  spinner.stop();

  if (connectedConnectors.length === 0) {
    Logger.warn('Нет подключенных клиентов');
    Logger.newLine();
    return;
  }

  Logger.success(`Найдено ${connectedConnectors.length} подключенных клиента(ов)`);
  Logger.newLine();

  const connector = await selectConnector(registry, connectedConnectors, cliOptions?.client);
  if (!connector) {
    Logger.newLine();
    return;
  }

  Logger.newLine();
  const success = await performDisconnect(connector);

  Logger.newLine();
  if (success) {
    Logger.success('✅ Готово!');
  }
}
