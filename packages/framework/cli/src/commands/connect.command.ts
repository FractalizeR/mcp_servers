/**
 * Connect команда для подключения MCP сервера к клиенту
 * @packageDocumentation
 */

import type { BaseMCPServerConfig, ConnectCommandOptions } from '../types.js';
import { InteractivePrompter } from '../utils/interactive-prompter.js';
import { Logger } from '../utils/logger.js';

/**
 * Команда для подключения MCP сервера к выбранному клиенту
 *
 * @param options - Опции команды
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry<YourConfig>();
 * const configManager = new ConfigManager<YourConfig>({
 *   projectName: 'your-server',
 *   safeFields: ['orgId', 'apiBase'],
 * });
 *
 * const configPrompts = [
 *   { name: 'token', type: 'password', message: 'OAuth токен:' },
 *   { name: 'orgId', type: 'input', message: 'ID организации:' },
 * ];
 *
 * await connectCommand({
 *   registry,
 *   configManager,
 *   configPrompts,
 * });
 * ```
 */
export async function connectCommand<TConfig extends BaseMCPServerConfig>(
  options: ConnectCommandOptions<TConfig>
): Promise<void> {
  const { registry, configManager, configPrompts, cliOptions, buildConfig } = options;

  Logger.header('🔌 Подключение MCP сервера');
  Logger.newLine();

  // 1. Найти установленные клиенты
  const spinner = Logger.spinner('Поиск установленных MCP клиентов...');
  const installedClients = await registry.findInstalled();
  spinner.stop();

  if (installedClients.length === 0) {
    Logger.error('Не найдено установленных MCP клиентов');
    Logger.info('Поддерживаемые клиенты: Claude Desktop, Claude Code, Codex, Gemini, Qwen');
    Logger.info('Установите хотя бы один из них для продолжения');
    return;
  }

  Logger.success(`Найдено ${installedClients.length} установленных клиента(ов)`);
  Logger.newLine();

  // 2. Выбрать клиент
  let connector;
  if (cliOptions?.client) {
    connector = registry.get(cliOptions.client);
    if (!connector) {
      Logger.error(`Клиент "${cliOptions.client}" не найден`);
      return;
    }

    const isInstalled = await connector.isInstalled();
    if (!isInstalled) {
      Logger.error(`Клиент "${cliOptions.client}" не установлен`);
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

  // 3. Собрать конфигурацию
  const savedConfig = await configManager.load();
  if (savedConfig) {
    Logger.info('Найдена сохраненная конфигурация (секретные поля будут запрошены заново)');
  }

  const prompter = new InteractivePrompter<TConfig>(configPrompts);
  const serverConfig = await prompter.promptServerConfig(savedConfig);

  // Построить полную конфигурацию
  const config = buildConfig
    ? buildConfig(serverConfig)
    : ({
        ...serverConfig,
        projectPath: process.cwd(),
      } as TConfig);

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
    Logger.success('Конфигурация сохранена (секретные поля исключены)');
  }

  Logger.newLine();
  Logger.success('✅ Готово! Теперь вы можете использовать MCP сервер в выбранном клиенте.');
}
