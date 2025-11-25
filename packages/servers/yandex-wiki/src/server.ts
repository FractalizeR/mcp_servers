#!/usr/bin/env node

/**
 * MCP Bundle для работы с Яндекс.Вики
 *
 * Реализует MCP-сервер для интеграции с API Яндекс.Вики,
 * позволяя LLM-моделям взаимодействовать с вики-страницами.
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
import type { Logger } from '@mcp-framework/infrastructure';
import type { ToolRegistry, ToolDefinition } from '@mcp-framework/core';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_DISPLAY_NAME,
  YANDEX_WIKI_ESSENTIAL_TOOLS,
} from './constants.js';

// DI Container (Composition Root)
import { createContainer, TYPES } from '#composition-root/index.js';

/**
 * Метрики инструментов для анализа размера tools/list response
 */
interface ToolsMetrics {
  totalTools: number;
  descriptionLength: number;
  estimatedTokens: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  bySubcategory: Record<string, number>;
}

/**
 * Подсчёт метрик инструментов
 */
function calculateToolsMetrics(definitions: ToolDefinition[]): ToolsMetrics {
  const descriptionLength = definitions.reduce((sum, def) => sum + def.description.length, 0);

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};

  for (const def of definitions) {
    // By category
    const category = def.category || 'unknown';
    byCategory[category] = (byCategory[category] || 0) + 1;

    // By priority
    const priority = def.priority || 'normal';
    byPriority[priority] = (byPriority[priority] || 0) + 1;

    // By subcategory
    if (def.subcategory) {
      bySubcategory[def.subcategory] = (bySubcategory[def.subcategory] || 0) + 1;
    }
  }

  return {
    totalTools: definitions.length,
    descriptionLength,
    estimatedTokens: Math.ceil(descriptionLength / 4),
    byCategory,
    byPriority,
    bySubcategory,
  };
}

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

    const definitions = toolRegistry.getDefinitionsByMode(
      config.toolDiscoveryMode,
      config.essentialTools,
      undefined, // categoryFilter не используется в Yandex Wiki
      undefined // disabledFilter не используется в Yandex Wiki
    );

    // Подсчёт метрик
    const metrics = calculateToolsMetrics(definitions);

    // Info level: базовая информация
    logger.info(
      `✅ Возвращаем ${metrics.totalTools} инструментов (режим: ${config.toolDiscoveryMode})`,
      {
        totalTools: metrics.totalTools,
        mode: config.toolDiscoveryMode,
        descriptionLength: metrics.descriptionLength,
        estimatedTokens: metrics.estimatedTokens,
      }
    );

    // Debug level: детальная разбивка
    logger.debug('📊 Распределение инструментов', {
      byCategory: metrics.byCategory,
      byPriority: metrics.byPriority,
      bySubcategory: metrics.bySubcategory,
    });

    // Debug level: порядок инструментов (для отладки сортировки)
    logger.debug('🔢 Порядок инструментов:', {
      order: definitions.map((d) => ({
        name: d.name,
        category: d.category,
        priority: d.priority || 'normal',
      })),
    });

    // Предупреждение для lazy режима
    if (config.toolDiscoveryMode === 'lazy') {
      logger.warn(`⚠️  ВНИМАНИЕ: Используется lazy режим discovery!`, {
        message: 'Lazy режим может не работать с некоторыми MCP клиентами',
        essentialTools: config.essentialTools,
        recommendation: 'Используйте TOOL_DISCOVERY_MODE=eager для совместимости',
      });
    }

    // Рекомендация переключиться на lazy mode при большом количестве инструментов
    if (config.toolDiscoveryMode === 'eager' && metrics.totalTools > 30) {
      logger.warn('⚠️  Рекомендация: много инструментов в eager mode', {
        totalTools: metrics.totalTools,
        estimatedTokens: metrics.estimatedTokens,
        recommendation: 'Рассмотрите TOOL_DISCOVERY_MODE=lazy для экономии контекста',
      });
    }

    // Предупреждение о больших descriptions
    if (metrics.estimatedTokens > 200) {
      logger.warn('⚠️  Descriptions занимают много токенов', {
        estimatedTokens: metrics.estimatedTokens,
        recommendation: 'Сократите descriptions для экономии контекста LLM',
      });
    }

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
    const originalName = request.params.name;
    let name = originalName;
    const { arguments: args } = request.params;

    logger.info(`🔧 Запрос инструмента: ${originalName}`);

    // Нормализация имени: удаление префикса сервера (добавляется MCP клиентами)
    // Примеры префиксов:
    // - "yandex-wiki:tool_name" (технический идентификатор)
    // - "FractalizeR's Yandex Wiki MCP:tool_name" (отображаемое имя в UI)
    const serverPrefixes = [
      `${MCP_SERVER_NAME}:`, // Технический идентификатор
      `${MCP_SERVER_DISPLAY_NAME}:`, // Отображаемое имя
    ];

    let removedPrefix: string | null = null;

    for (const prefix of serverPrefixes) {
      if (name.startsWith(prefix)) {
        removedPrefix = prefix;
        name = name.slice(prefix.length);
        logger.debug(`✂️  Убран префикс сервера`, {
          original: originalName,
          normalized: name,
          prefix: removedPrefix,
        });
        break;
      }
    }

    if (!removedPrefix) {
      logger.debug(`ℹ️  Префикс не обнаружен (прямой вызов)`, {
        toolName: name,
      });
    }

    try {
      // ToolRegistry сам логирует параметры и результаты
      const result = await toolRegistry.execute(name, args as Record<string, unknown>);

      // Логируем результат выполнения
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
      // Перехват необработанных исключений (на случай если что-то пойдёт не так)
      logger.error(`💥 Необработанное исключение при выполнении инструмента ${name}:`, {
        originalName,
        normalizedName: name,
        removedPrefix,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

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
                originalName,
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

    // ✅ Переопределяем essentialTools в зависимости от режима discovery
    // - eager: только ping (search_tools избыточен, т.к. Claude видит все инструменты)
    // - lazy: ping + search_tools (search_tools нужен для discovery)
    const essentialTools =
      config.toolDiscoveryMode === 'eager' ? ['ywping'] : YANDEX_WIKI_ESSENTIAL_TOOLS;

    const configWithEssentialTools: ServerConfig = {
      ...config,
      essentialTools,
    };

    // Создание DI контейнера (Logger создаётся внутри)
    const container = await createContainer(configWithEssentialTools);

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
    setupServer(server, toolRegistry, configWithEssentialTools, logger);

    // Настройка обработчиков сигналов
    setupSignalHandlers(server, logger);

    // Запуск сервера с stdio транспортом
    const transport = new StdioServerTransport();
    await server.connect(transport);

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
