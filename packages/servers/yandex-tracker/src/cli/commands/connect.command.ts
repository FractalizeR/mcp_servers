/**
 * Команда подключения MCP сервера к клиенту
 */

import { ConnectorRegistry } from '../connectors/registry.js';
import { ConfigManager } from '../utils/config-manager.js';
import { InteractivePrompter } from '../utils/interactive-prompter.js';
import { Logger } from '../utils/logger.js';
import { isError } from '#common/type-guards.js';

export interface ConnectCommandOptions {
  client?: string;
}

export async function connectCommand(options: ConnectCommandOptions): Promise<void> {
  const registry = new ConnectorRegistry();
  const configManager = new ConfigManager();

  Logger.header('🔌 Подключение MCP сервера');

  // 1. Найти установленные клиенты
  const spinner = Logger.spinner('Поиск установленных MCP клиентов...');
  const installedClients = await registry.findInstalled();
  spinner.stop();

  if (installedClients.length === 0) {
    Logger.error('Не найдено установленных MCP клиентов');
    Logger.info('Поддерживаемые клиенты: Claude Desktop, Claude Code, Codex');
    Logger.info('Установите хотя бы один из них для продолжения');
    return;
  }

  Logger.success(`Найдено ${installedClients.length} установленных клиента(ов)`);
  Logger.newLine();

  // 2. Выбрать клиент
  let connector;
  if (options.client) {
    connector = registry.get(options.client);
    if (!connector) {
      Logger.error(`Клиент "${options.client}" не найден`);
      return;
    }

    const isInstalled = await connector.isInstalled();
    if (!isInstalled) {
      Logger.error(`Клиент "${options.client}" не установлен`);
      return;
    }

    Logger.info(`Выбран клиент: ${connector.getClientInfo().displayName}`);
  } else {
    const clientInfos = installedClients.map((c) => c.getClientInfo());
    const selectedName = await InteractivePrompter.promptClientSelection(clientInfos);
    connector = registry.get(selectedName);
  }

  if (!connector) {
    Logger.error('Не удалось выбрать клиент');
    return;
  }

  Logger.newLine();

  // 3. Спросить конфигурацию
  const savedConfig = await configManager.load();
  if (savedConfig) {
    Logger.info('Найдена сохраненная конфигурация (токен будет запрошен заново)');
  }

  const serverConfig = await InteractivePrompter.promptServerConfig(savedConfig);
  const config = {
    ...serverConfig,
    projectPath: process.cwd(),
  };

  Logger.newLine();

  // 4. Валидация
  const errors = await connector.validateConfig(config);
  if (errors.length > 0) {
    Logger.error('Ошибки конфигурации:');
    errors.forEach((err) => Logger.error(`  - ${err}`));
    return;
  }

  // 5. Подключение
  const connectSpinner = Logger.spinner(`Подключаю к ${connector.getClientInfo().displayName}...`);

  try {
    await connector.connect(config);
    connectSpinner.succeed(
      `MCP сервер успешно подключен к ${connector.getClientInfo().displayName}!`
    );

    const status = await connector.getStatus();
    if (status.details) {
      Logger.info(`Конфигурация: ${status.details.configPath}`);
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    connectSpinner.fail(`Ошибка подключения: ${errorMessage}`);
    return;
  }

  Logger.newLine();

  // 6. Предложить сохранить конфигурацию
  const shouldSave = await InteractivePrompter.promptConfirmation(
    'Сохранить конфигурацию для следующего раза?',
    true
  );

  if (shouldSave) {
    await configManager.save(config);
    Logger.success('Конфигурация сохранена');
  }

  Logger.newLine();
  Logger.success('✅ Готово! Теперь вы можете использовать MCP сервер в выбранном клиенте.');
}
