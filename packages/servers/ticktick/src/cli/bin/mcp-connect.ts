#!/usr/bin/env node

/**
 * CLI для TickTick MCP Server.
 *
 * Использует `@fractalizer/mcp-cli` (агностичный framework) и доменный адаптер
 * `buildTickTickServerLaunch` для построения спецификации запуска сервера.
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
import { ticktickConfigPrompts } from '../prompts.js';
import { buildTickTickServerLaunch } from '../build-launch.js';
import { serializeTickTickConfig } from '../serialize-config.js';
import { deserializeTickTickConfig } from '../deserialize-config.js';
import { getTickTickDoctorChecks } from '../doctor-checks.js';
import type { TickTickMCPConfig } from '../types.js';
import { PROJECT_BASE_NAME } from '../../constants.js';

function main(): void {
  const registry = new ConnectorRegistry();
  registry.register(createConnector('claude-desktop', PROJECT_BASE_NAME));
  registry.register(new ClaudeCodeConnector(PROJECT_BASE_NAME));
  registry.register(createConnector('gemini', PROJECT_BASE_NAME));
  registry.register(createConnector('qwen', PROJECT_BASE_NAME));
  registry.register(createConnector('codex', PROJECT_BASE_NAME));

  const configManager = new ConfigManager<TickTickMCPConfig>({
    projectName: PROJECT_BASE_NAME,
    serialize: serializeTickTickConfig,
    deserialize: deserializeTickTickConfig,
  });

  program
    .command('connect')
    .description('Подключить MCP сервер к клиенту')
    .option('--client <name>', 'Название клиента')
    .action(async (opts: { client?: string }) => {
      await connectCommand<TickTickMCPConfig>({
        registry,
        configManager,
        configPrompts: ticktickConfigPrompts,
        buildServerLaunch: buildTickTickServerLaunch,
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
        extraChecks: getTickTickDoctorChecks(),
      });
      process.exit(report.summary.fail > 0 ? 1 : 0);
    });

  program.parse();
}

main();
