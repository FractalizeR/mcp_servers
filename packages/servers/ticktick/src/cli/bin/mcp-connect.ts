#!/usr/bin/env node

/**
 * CLI для TickTick MCP Server
 *
 * Использует @fractalizer/mcp-cli для управления подключениями
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
} from '@fractalizer/mcp-cli';
import { ticktickConfigPrompts } from '../prompts.js';
import type { TickTickMCPConfig } from '../types.js';
import { PROJECT_BASE_NAME, SERVER_ENTRY_POINT } from '../../constants.js';

/**
 * Main entry point
 */
function main(): void {
  // Создать реестр и зарегистрировать коннекторы
  const registry = new ConnectorRegistry<TickTickMCPConfig>();
  registry.register(
    new ClaudeDesktopConnector<TickTickMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(
    new ClaudeCodeConnector<TickTickMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT)
  );
  registry.register(new CodexConnector<TickTickMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT));
  registry.register(new GeminiConnector<TickTickMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT));
  registry.register(new QwenConnector<TickTickMCPConfig>(PROJECT_BASE_NAME, SERVER_ENTRY_POINT));

  // Создать менеджер конфигурации
  const configManager = new ConfigManager<TickTickMCPConfig>({
    projectName: PROJECT_BASE_NAME,
    safeFields: ['redirectUri', 'logLevel', 'projectPath'],
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
        configPrompts: ticktickConfigPrompts,
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

// Запуск
main();
