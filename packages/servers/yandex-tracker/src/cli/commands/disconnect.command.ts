/**
 * Команда отключения MCP сервера от клиента
 */

import { ConnectorRegistry } from '../connectors/registry.js';
import { InteractivePrompter } from '../utils/interactive-prompter.js';
import { Logger } from '../utils/logger.js';

export interface DisconnectCommandOptions {
  client?: string;
}

export async function disconnectCommand(options: DisconnectCommandOptions): Promise<void> {
  const registry = new ConnectorRegistry();

  Logger.header('🔌 Отключение MCP сервера');

  // 1. Определить клиента
  let connector;
  if (options.client) {
    connector = registry.get(options.client);
    if (!connector) {
      Logger.error(`Клиент "${options.client}" не найден`);
      return;
    }
  } else {
    // Найти подключенные клиенты
    const spinner = Logger.spinner('Поиск подключенных клиентов...');
    const statuses = await registry.checkAllStatuses();
    spinner.stop();

    const connectedClients = Array.from(statuses.entries())
      .filter(([, status]) => status.connected)
      .map(([name]) => registry.get(name))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    if (connectedClients.length === 0) {
      Logger.warn('MCP сервер не подключен ни к одному клиенту');
      return;
    }

    const clientInfos = connectedClients.map((c) => c.getClientInfo());
    const selectedName = await InteractivePrompter.promptSelection(
      'Выберите клиент для отключения:',
      clientInfos.map((info) => ({ name: info.displayName, value: info.name }))
    );

    connector = registry.get(selectedName);
  }

  if (!connector) {
    Logger.error('Не удалось выбрать клиент');
    return;
  }

  // 2. Подтверждение
  const confirmed = await InteractivePrompter.promptConfirmation(
    `Отключить MCP сервер от ${connector.getClientInfo().displayName}?`,
    true
  );

  if (!confirmed) {
    Logger.info('Отмена операции');
    return;
  }

  // 3. Отключение
  const spinner = Logger.spinner(`Отключаю от ${connector.getClientInfo().displayName}...`);

  try {
    await connector.disconnect();
    spinner.succeed(`MCP сервер успешно отключен от ${connector.getClientInfo().displayName}`);
  } catch (error) {
    spinner.fail(`Ошибка отключения: ${(error as Error).message}`);
  }
}
