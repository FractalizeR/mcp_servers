#!/usr/bin/env node

/**
 * CLI инструмент для управления подключениями MCP сервера
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectCommand } from '../commands/connect.command.js';
import { disconnectCommand } from '../commands/disconnect.command.js';
import { statusCommand } from '../commands/status.command.js';
import { listCommand } from '../commands/list.command.js';
import { Logger } from '../utils/logger.js';
import { MCP_SERVER_DISPLAY_NAME, MCP_SERVER_NAME } from '../../src/constants.js';

/**
 * Получение версии из package.json
 */
function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0'; // fallback если не удалось прочитать
  }
}

const program = new Command();

program
  .name(MCP_SERVER_NAME)
  .description(`${MCP_SERVER_DISPLAY_NAME} - Управление подключениями MCP сервера`)
  .version(getPackageVersion());

// Команда connect
program
  .command('connect')
  .description('Подключить MCP сервер к клиенту (интерактивно)')
  .option('-c, --client <name>', 'Имя клиента (claude-desktop, claude-code, codex)')
  .action(async (options) => {
    try {
      await connectCommand(options);
    } catch (error) {
      Logger.error(`Ошибка: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Команда disconnect
program
  .command('disconnect')
  .description('Отключить MCP сервер от клиента')
  .option('-c, --client <name>', 'Имя клиента (claude-desktop, claude-code, codex)')
  .action(async (options) => {
    try {
      await disconnectCommand(options);
    } catch (error) {
      Logger.error(`Ошибка: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Команда status
program
  .command('status')
  .description('Показать статус подключений MCP сервера')
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      Logger.error(`Ошибка: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Команда list
program
  .command('list')
  .description('Показать список поддерживаемых MCP клиентов')
  .action(async () => {
    try {
      await listCommand();
    } catch (error) {
      Logger.error(`Ошибка: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Обработка глобальных ошибок
process.on('unhandledRejection', (error: Error) => {
  Logger.error(`Необработанная ошибка: ${error.message}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  Logger.newLine();
  Logger.info('Прервано пользователем');
  process.exit(0);
});

// Запуск CLI
program.parse(process.argv);

// Показать help если команды не указаны
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
