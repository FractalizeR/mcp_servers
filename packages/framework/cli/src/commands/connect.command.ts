/**
 * Connect команда для подключения MCP сервера к клиенту
 * @packageDocumentation
 */

import type { ConnectCommandOptions } from '../types.js';
import { InteractivePrompter } from '../utils/interactive-prompter.js';
import { Logger } from '../utils/logger.js';

/**
 * Команда подключения MCP сервера к выбранному клиенту.
 *
 * Поток:
 *  1. Найти установленные клиенты (`registry.findInstalled`).
 *  2. Выбрать клиент (через CLI флаг `--client` или интерактивно).
 *  3. Загрузить сохранённую доменную конфигурацию (`configManager.load`).
 *  4. Собрать новую доменную конфигурацию через промпты.
 *  5. Адаптер `buildServerLaunch(config)` → {@link ServerLaunchSpec}.
 *  6. `connector.validateLaunchSpec(spec)`; при ошибках — abort (без `connect`/`save`).
 *  7. `connector.connect(spec)`. При исключении управление прерывается, `save` не достигается.
 *  8. Информационный `getStatus()`.
 *  9. После успешного connect — `configManager.save(domainConfig)` и warning про plaintext-токен.
 *
 * @example
 * ```typescript
 * await connectCommand({
 *   registry,
 *   configManager,
 *   configPrompts,
 *   buildServerLaunch: (cfg) => ({
 *     command: 'node',
 *     args: ['/abs/path/server.bundle.cjs'],
 *     env: { API_TOKEN: cfg.token, ORG_ID: cfg.orgId },
 *   }),
 * });
 * ```
 */
export async function connectCommand<TDomainConfig extends object>(
  options: ConnectCommandOptions<TDomainConfig>
): Promise<void> {
  const { registry, configManager, configPrompts, buildServerLaunch, cliOptions } = options;

  Logger.header('🔌 Подключение MCP сервера');
  Logger.newLine();

  // 1. Найти установленные клиенты
  const spinner = Logger.spinner('Поиск установленных MCP клиентов...');
  const installedClients = await registry.findInstalled();
  spinner.stop();

  if (installedClients.length === 0) {
    Logger.error('Не найдено установленных MCP клиентов');
    Logger.info('Установите хотя бы один поддерживаемый MCP клиент');
    return;
  }

  Logger.success(`Найдено ${String(installedClients.length)} установленных клиента(ов)`);
  Logger.newLine();

  // 2. Выбрать клиент
  let connector;
  if (cliOptions?.client) {
    connector = registry.get(cliOptions.client);
    if (!connector) {
      Logger.error(`Клиент "${cliOptions.client}" не найден`);
      const valid = registry.getAll();
      if (valid.length > 0) {
        Logger.info('Доступные клиенты:');
        for (const c of valid) {
          const info = c.getClientInfo();
          Logger.info(`  - ${info.name} (${info.displayName})`);
        }
      }
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

  // 3. Загрузить сохранённую доменную конфигурацию
  const savedConfig = await configManager.load();
  if (savedConfig) {
    Logger.info('Найдена сохраненная конфигурация (секретные поля будут запрошены заново)');
  }

  // 4. Собрать доменную конфигурацию
  const prompter = new InteractivePrompter<TDomainConfig>(configPrompts);
  const domainConfig = await prompter.promptServerConfig(savedConfig);

  Logger.newLine();

  // 5. Построить spec через адаптер
  const spec = buildServerLaunch(domainConfig);

  // 6. Валидация
  const errors = await connector.validateLaunchSpec(spec);
  if (errors.length > 0) {
    Logger.error('Ошибки конфигурации запуска:');
    errors.forEach((err) => Logger.error(`  - ${err}`));
    return;
  }

  // 7. Подключение (если бросит — save не выполняется)
  const connectSpinner = Logger.spinner(`Подключаю к ${connector.getClientInfo().displayName}...`);
  try {
    await connector.connect(spec);
    connectSpinner.succeed(
      `MCP сервер успешно подключен к ${connector.getClientInfo().displayName}!`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    connectSpinner.fail(`Ошибка подключения: ${errorMessage}`);
    return;
  }

  // 8. Информационный статус
  const status = await connector.getStatus();
  if (status.details?.configPath) {
    Logger.info(`Конфигурация: ${status.details.configPath}`);
  }

  Logger.newLine();

  // 9. Безусловно сохранить доменную конфигурацию (после успешного connect).
  //    Подключение к клиенту уже выполнено успешно; неудача save локального
  //    кэша — не критична, но информируем пользователя, чтобы при необходимости
  //    он мог разобраться (например, нет прав на ~/. dir).
  try {
    await configManager.save(domainConfig);
    Logger.success(`Конфигурация сохранена: ${configManager.getConfigPath()}`);
  } catch (saveError: unknown) {
    const errMsg = saveError instanceof Error ? saveError.message : String(saveError);
    Logger.error(`Подключение выполнено, но локальный кэш конфига не сохранён: ${errMsg}`);
    Logger.info(`Путь к локальному кэшу: ${configManager.getConfigPath()}`);
    if (status.details?.configPath) {
      Logger.info(`Путь к client config (подключение активно): ${status.details.configPath}`);
    }
  }

  // Предупреждение о plaintext-хранении токена в конфиге клиента
  if (status.details?.configPath) {
    Logger.warn(
      `⚠️ Токен сохранён в plaintext в ${status.details.configPath}. ` +
        'Убедитесь, что файл недоступен другим пользователям системы.'
    );
  } else {
    Logger.warn(
      '⚠️ Токен сохранён в plaintext в конфиге клиента. ' +
        'Убедитесь, что файл недоступен другим пользователям системы.'
    );
  }

  Logger.newLine();
  Logger.success('✅ Готово! Теперь вы можете использовать MCP сервер в выбранном клиенте.');
}
