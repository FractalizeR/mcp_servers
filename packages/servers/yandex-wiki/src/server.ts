#!/usr/bin/env node

/**
 * MCP Bundle для работы с Яндекс.Вики
 *
 * Реализует MCP-сервер для интеграции с API Яндекс.Вики,
 * позволяя LLM-моделям взаимодействовать с вики-страницами.
 *
 * Вся протокольная логика (lifecycle, transport, tools/list, tools/call)
 * живёт в @fractalizer/mcp-core (createMcpServerAdapter, пакет 4.1.B плана
 * модернизации MCP) — этот файл только собирает DI-контейнер и запускает
 * adapter.
 */

// IMPORTANT: Must be imported before any inversify decorators are used
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from '#config';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import { createMcpServerAdapter } from '@fractalizer/mcp-core';
import { MCP_SERVER_NAME, MCP_SERVER_DISPLAY_NAME } from './constants.js';

// DI Container (Composition Root)
import { createContainer, TYPES } from '#composition-root/index.js';

/**
 * Получение версии из package.json
 */
function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0'; // fallback если не удалось прочитать
  }
}

/**
 * Основная функция запуска сервера
 */
async function main(): Promise<void> {
  let logger: Logger | undefined;

  try {
    // Загрузка конфигурации
    const config = loadConfig();

    // Создание DI контейнера (Logger создаётся внутри)
    const container = await createContainer(config);

    // Получение Logger из контейнера
    logger = container.get<Logger>(TYPES.Logger);
    logger.info('Запуск Яндекс.Вики MCP сервера...');
    logger.debug('Конфигурация загружена', {
      apiBase: config.apiBase,
      logLevel: config.logLevel,
      requestTimeout: config.requestTimeout,
      logsDir: config.logsDir,
      prettyLogs: config.prettyLogs,
    });

    // Получение ToolRegistry из контейнера (уже несёт свою ToolAccessPolicy —
    // единый источник истины для tools/list и tools/call, см. tool-registry.ts)
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    const adapter = createMcpServerAdapter({
      serverName: MCP_SERVER_NAME,
      serverDisplayName: MCP_SERVER_DISPLAY_NAME,
      version: getPackageVersion(),
      toolRegistry,
      logger,
    });

    await adapter.start();

    logger.info('Яндекс.Вики MCP сервер успешно запущен');
    logger.info('Ожидание запросов от MCP клиента...');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

    if (logger) {
      logger.error('Критическая ошибка при запуске сервера:', error);
    } else {
      // Если логгер ещё не инициализирован, выводим в stderr напрямую
      console.error(`[ERROR] Критическая ошибка при запуске сервера: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }

    process.exit(1);
  }
}

// Запуск сервера
main().catch((error) => {
  console.error('Необработанная ошибка:', error);
  process.exit(1);
});
