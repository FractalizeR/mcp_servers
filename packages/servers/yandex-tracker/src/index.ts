#!/usr/bin/env node

/**
 * MCP Bundle для работы с Яндекс.Трекером
 *
 * Реализует MCP-сервер для интеграции с API Яндекс.Трекера,
 * позволяя LLM-моделям взаимодействовать с задачами и проектами.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from '@mcp-framework/infrastructure';
import type { Logger, ServerConfig } from '@mcp-framework/infrastructure';
import type { ToolRegistry } from '@mcp-framework/core';
import { buildToolName } from '@mcp-framework/core';
import { MCP_SERVER_NAME, MCP_TOOL_PREFIX } from './constants.js';

// DI Container (Composition Root)
import { createContainer, TYPES } from '@composition-root/index.js';

/**
 * Настройка обработчиков запросов MCP сервера
 */
function setupServer(
  server: Server,
  toolRegistry: ToolRegistry,
  config: ServerConfig,
  logger: Logger
): void {
  // Обработчик запроса списка инструментов
  server.setRequestHandler(ListToolsRequestSchema, () => {
    logger.debug(`Запрос списка инструментов (режим: ${config.toolDiscoveryMode})`);

    const definitions = toolRegistry.getDefinitionsByMode(
      config.toolDiscoveryMode,
      config.essentialTools
    );

    logger.info(
      `Возвращаем ${definitions.length} инструментов ` +
        `(режим: ${config.toolDiscoveryMode}, essential: [${config.essentialTools.join(', ')}])`
    );

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

    try {
      // ToolRegistry сам логирует параметры и результаты
      const result = await toolRegistry.execute(name, args as Record<string, unknown>);

      // Логируем результат выполнения
      if (result.isError) {
        logger.error(`Инструмент ${name} вернул ошибку`, {
          hasContent: result.content?.length > 0,
          contentPreview:
            result.content?.[0]?.type === 'text'
              ? result.content[0].text.substring(0, 200)
              : undefined,
        });
      } else {
        logger.debug(`Инструмент ${name} выполнен успешно (результат передан клиенту)`);
      }

      return result;
    } catch (error) {
      // Перехват необработанных исключений (на случай если что-то пойдёт не так)
      logger.error(`Необработанное исключение при выполнении инструмента ${name}:`, error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: `Необработанная ошибка при выполнении инструмента: ${
                  error instanceof Error ? error.message : 'Неизвестная ошибка'
                }`,
                tool: name,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
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

    // Переопределяем essentialTools с правильными префиксами
    // DEFAULT_ESSENTIAL_TOOLS содержит ['ping', 'search_tools'] без префиксов,
    // но реальные имена инструментов: 'fr_yandex_tracker_ping', 'search_tools'
    const configWithPrefixes: ServerConfig = {
      ...config,
      essentialTools: config.essentialTools.map((name) => {
        // SearchToolsTool не имеет префикса (framework-level tool)
        if (name === 'search_tools') {
          return name;
        }
        // Остальные инструменты должны использовать префикс yandex-tracker
        // Проверяем, есть ли уже префикс
        if (name.startsWith(MCP_TOOL_PREFIX)) {
          return name;
        }
        return buildToolName(name, MCP_TOOL_PREFIX);
      }),
    };

    // Создание DI контейнера (Logger создаётся внутри)
    const container = await createContainer(configWithPrefixes);

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
    setupServer(server, toolRegistry, configWithPrefixes, logger);

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
