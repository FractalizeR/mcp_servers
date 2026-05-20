#!/usr/bin/env node

/**
 * CLI для Yandex Tracker MCP Server.
 *
 * Использует `@fractalizer/mcp-cli` (агностичный framework) и доменный адаптер
 * `buildYtServerLaunch` для построения спецификации запуска сервера.
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
  createConnector,
  ClaudeCodeConnector,
} from '@fractalizer/mcp-cli';
import { ytConfigPrompts } from '../prompts.js';
import { buildYtServerLaunch } from '../build-launch.js';
import { serializeYtConfig } from '../serialize-config.js';
import { deserializeYtConfig } from '../deserialize-config.js';
import type { YandexTrackerMCPConfig } from '../types.js';
import { PROJECT_BASE_NAME } from '../../constants.js';

function main(): void {
  // Реестр коннекторов.
  // Claude Code управляется командами `claude mcp ...`, остальные — записью
  // в JSON/TOML-файл клиента; общий контракт — `MCPConnector`.
  const registry = new ConnectorRegistry();
  registry.register(createConnector('claude-desktop', PROJECT_BASE_NAME));
  registry.register(new ClaudeCodeConnector(PROJECT_BASE_NAME));
  registry.register(createConnector('gemini', PROJECT_BASE_NAME));
  registry.register(createConnector('qwen', PROJECT_BASE_NAME));
  registry.register(createConnector('codex', PROJECT_BASE_NAME));

  // Менеджер сохранённой доменной конфигурации (без секретов).
  const configManager = new ConfigManager<YandexTrackerMCPConfig>({
    projectName: PROJECT_BASE_NAME,
    serialize: serializeYtConfig,
    deserialize: deserializeYtConfig,
  });

  program
    .command('connect')
    .description('Подключить MCP сервер к клиенту')
    .option('--client <name>', 'Название клиента')
    .action(async (opts: { client?: string }) => {
      await connectCommand<YandexTrackerMCPConfig>({
        registry,
        configManager,
        configPrompts: ytConfigPrompts,
        buildServerLaunch: buildYtServerLaunch,
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

main();
