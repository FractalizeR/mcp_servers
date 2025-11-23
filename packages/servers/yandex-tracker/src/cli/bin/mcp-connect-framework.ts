/**
 * Framework-based CLI для Yandex Tracker MCP Server
 */

import { program } from 'commander';
import {
  ConnectorRegistry,
  ConfigManager,
  connectCommand,
  disconnectCommand,
  statusCommand,
  listCommand,
  validateCommand,
  // Импортируем коннекторы
  ClaudeDesktopConnector,
  ClaudeCodeConnector,
  CodexConnector,
  GeminiConnector,
  QwenConnector,
} from '@mcp-framework/cli';
import { ytConfigPrompts } from '../prompts.js';
import type { YandexTrackerMCPConfig } from '../types.js';
import { PROJECT_BASE_NAME, SERVER_ENTRY_POINT } from '../../constants.js';

/**
 * Main entry point для framework-based CLI
 */
export function main(): void {
  // Создать реестр и зарегистрировать коннекторы
  const registry = new ConnectorRegistry<YandexTrackerMCPConfig>();
  registry.register(
    new ClaudeDesktopConnector<YandexTrackerMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(
    new ClaudeCodeConnector<YandexTrackerMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(
    new CodexConnector<YandexTrackerMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(
    new GeminiConnector<YandexTrackerMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(new QwenConnector<YandexTrackerMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT));

  // Создать менеджер конфигурации
  const configManager = new ConfigManager<YandexTrackerMCPConfig>({
    projectName: PROJECT_BASE_NAME,
    safeFields: ['orgId', 'apiBase', 'requestTimeout', 'logLevel', 'projectPath'],
  });

  // Команды
  program
    .command('connect')
    .description('Подключить MCP сервер к клиенту')
    .option('--client <name>', 'Название клиента')
    .action(async (opts: { client?: string }) => {
      await connectCommand({
        registry,
        configManager,
        configPrompts: ytConfigPrompts,
        cliOptions: opts,
      });
    });

  program
    .command('disconnect')
    .description('Отключить MCP сервер от клиента')
    .option('--client <name>', 'Название клиента')
    .action(async (opts: { client?: string }) => {
      await disconnectCommand({
        registry,
        cliOptions: opts,
      });
    });

  program
    .command('status')
    .description('Проверить статус подключений')
    .action(async () => {
      await statusCommand({ registry });
    });

  program
    .command('list')
    .description('Показать список поддерживаемых клиентов')
    .action(async () => {
      await listCommand({ registry });
    });

  program
    .command('validate')
    .description('Проверить валидность конфигураций MCP клиентов')
    .action(async () => {
      await validateCommand({ registry });
    });

  program.parse();
}
