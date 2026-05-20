#!/usr/bin/env node

/**
 * CLI для Yandex Wiki MCP Server.
 *
 * Использует `@fractalizer/mcp-cli` (агностичный framework) и доменный адаптер
 * `buildYwServerLaunch` для построения спецификации запуска сервера.
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
  doctorCommand,
  createConnector,
  ClaudeCodeConnector,
} from '@fractalizer/mcp-cli';
import { ywConfigPrompts } from '../prompts.js';
import { buildYwServerLaunch } from '../build-launch.js';
import { serializeYwConfig } from '../serialize-config.js';
import { deserializeYwConfig } from '../deserialize-config.js';
import { getYwDoctorChecks } from '../doctor-checks.js';
import type { YandexWikiMCPConfig } from '../types.js';
import { PROJECT_BASE_NAME } from '../../constants.js';

function main(): void {
  const registry = new ConnectorRegistry();
  registry.register(createConnector('claude-desktop', PROJECT_BASE_NAME));
  registry.register(new ClaudeCodeConnector(PROJECT_BASE_NAME));
  registry.register(createConnector('gemini', PROJECT_BASE_NAME));
  registry.register(createConnector('qwen', PROJECT_BASE_NAME));
  registry.register(createConnector('codex', PROJECT_BASE_NAME));

  const configManager = new ConfigManager<YandexWikiMCPConfig>({
    projectName: PROJECT_BASE_NAME,
    serialize: serializeYwConfig,
    deserialize: deserializeYwConfig,
  });

  program
    .command('connect')
    .description('Подключить MCP сервер к клиенту')
    .option('--client <name>', 'Название клиента')
    .action(async (opts: { client?: string }) => {
      await connectCommand<YandexWikiMCPConfig>({
        registry,
        configManager,
        configPrompts: ywConfigPrompts,
        buildServerLaunch: buildYwServerLaunch,
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

  program
    .command('doctor')
    .description('Диагностика MCP подключений (выявление сломанных конфигов)')
    .action(async () => {
      const report = await doctorCommand({
        registry,
        extraChecks: getYwDoctorChecks(),
      });
      process.exit(report.summary.fail > 0 ? 1 : 0);
    });

  program.parse();
}

main();
