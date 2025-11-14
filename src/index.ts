#!/usr/bin/env node

/**
 * MCP Bundle для работы с Яндекс.Трекером
 *
 * Реализует MCP-сервер для интеграции с API Яндекс.Трекера,
 * позволяя LLM-моделям взаимодействовать с задачами и проектами.
 */

import 'reflect-metadata';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from '@infrastructure/config.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { ToolRegistry } from '@mcp/tool-registry.js';

// DI Container (Composition Root)
import { createContainer, TYPES } from '@composition-root/index.js';

/**
 * Настройка обработчиков запросов MCP сервера
 */
function setupServer(server: Server, toolRegistry: ToolRegistry, logger: Logger): void {
  // Обработчик запроса списка инструментов
  server.setRequestHandler(ListToolsRequestSchema, () => {
    logger.debug('Запрос списка инструментов');

    const definitions = toolRegistry.getDefinitions();

    return {
      tools: definitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
      })),
    };
  });

  // Обработчик вызова инструмента
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Получен запрос на выполнение инструмента: ${name}`);

    // ToolRegistry сам логирует параметры и результаты
    return toolRegistry.execute(name, args as Record<string, unknown>);
  });

  // Обработка ошибок сервера
  server.onerror = (error): void => {
    logger.error('Ошибка MCP сервера:', error);
  };
}

/**
 * Настройка обработчиков сигналов завершения
 */
function setupSignalHandlers(server: Server, logger: Logger): void {
  const handleShutdown = (signal: string): void => {
    logger.info(`Получен сигнал ${signal}, завершение работы...`);
    void server
      .close()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Ошибка при закрытии сервера:', error);
        process.exit(1);
      });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
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
    const container = createContainer(config);

    // Получение Logger из контейнера
    logger = container.get<Logger>(TYPES.Logger);
    logger.info('Запуск Яндекс.Трекер MCP сервера...');
    logger.debug('Конфигурация загружена', {
      apiBase: config.apiBase,
      logLevel: config.logLevel,
      requestTimeout: config.requestTimeout,
      logsDir: config.logsDir,
      prettyLogs: config.prettyLogs,
    });

    // Получение ToolRegistry из контейнера
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Создание MCP сервера
    const server = new Server(
      {
        name: 'yandex-tracker-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Настройка обработчиков сервера
    setupServer(server, toolRegistry, logger);

    // Настройка обработчиков сигналов
    setupSignalHandlers(server, logger);

    // Запуск сервера с stdio транспортом
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Яндекс.Трекер MCP сервер успешно запущен');
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
