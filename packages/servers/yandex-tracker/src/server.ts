#!/usr/bin/env node

/**
 * MCP Bundle для работы с Яндекс.Трекером
 *
 * Реализует MCP-сервер для интеграции с API Яндекс.Трекера,
 * позволяя LLM-моделям взаимодействовать с задачами и проектами.
 */

// IMPORTANT: Must be imported before any inversify decorators are used
import 'reflect-metadata';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from '#config';
import type { ServerConfig } from '#config';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import { projectToolDefinitionsForList } from '@fractalizer/mcp-core';
import { MCP_SERVER_NAME } from './constants.js';

// DI Container (Composition Root)
import { createContainer, TYPES } from '#composition-root/index.js';

// Handler helpers (вынесены для уменьшения размера setupServer)
import {
  calculateToolsMetrics,
  normalizeToolName,
  logToolsMetrics,
  logToolsWarnings,
  createErrorResponse,
} from './server/handlers.js';

/**
 * Настройка обработчиков запросов MCP сервера
 */
function setupServer(
  server: Server,
  toolRegistry: ToolRegistry,
  config: ServerConfig,
  logger: Logger
): void {
  // Обработчик инициализации соединения
  server.setRequestHandler(InitializeRequestSchema, (request) => {
    const { clientInfo, protocolVersion } = request.params;

    logger.info(`🤝 Подключение MCP клиента`, {
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      protocolVersion,
    });

    return {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: getPackageVersion(),
      },
    };
  });

  // Обработчик запроса списка инструментов
  server.setRequestHandler(ListToolsRequestSchema, () => {
    logger.info(`📋 Запрос tools/list от клиента`);

    const definitions = toolRegistry.getDefinitions(config.disabledToolGroups);

    const metrics = calculateToolsMetrics(definitions);
    logToolsMetrics(logger, config, definitions, metrics);
    logToolsWarnings(logger, metrics);

    return {
      tools: projectToolDefinitionsForList(definitions),
    };
  });

  // Обработчик вызова инструмента
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const originalName = request.params.name;
    const { arguments: args } = request.params;

    logger.info(`🔧 Запрос инструмента: ${originalName}`);

    // Нормализация имени: удаление префикса сервера (добавляется MCP клиентами)
    const { name, removedPrefix } = normalizeToolName(originalName, logger);

    try {
      const result = await toolRegistry.execute(name, args as Record<string, unknown>);

      if (result.isError) {
        logger.error(`❌ Инструмент ${name} вернул ошибку`, {
          originalName,
          normalizedName: name,
          removedPrefix,
          hasContent: result.content.length > 0,
          contentPreview:
            result.content[0]?.type === 'text'
              ? result.content[0].text.substring(0, 200)
              : undefined,
        });
      } else {
        logger.info(`✅ Инструмент ${name} выполнен успешно`);
      }

      return result;
    } catch (error) {
      logger.error(`💥 Необработанное исключение при выполнении инструмента ${name}:`, {
        originalName,
        normalizedName: name,
        removedPrefix,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return createErrorResponse(error, name, originalName);
    }
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
        name: MCP_SERVER_NAME,
        version: getPackageVersion(),
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Настройка обработчиков сервера
    setupServer(server, toolRegistry, config, logger);

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
