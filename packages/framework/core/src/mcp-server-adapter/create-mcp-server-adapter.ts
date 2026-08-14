/**
 * Общий adapter жизненного цикла и транспорта MCP-сервера (пакет 4.1.B
 * плана модернизации MCP 2026-07-28).
 *
 * Выносит в framework то, что было почти дословно продублировано в трёх
 * server.ts (yandex-tracker, yandex-wiki, ticktick): создание Server,
 * регистрацию хендлеров initialize/tools/list/tools/call, нормализацию
 * имени инструмента, метрики и предупреждения tools/list, подключение
 * stdio-транспорта и обработчики сигналов завершения. Три server.ts после
 * этого содержат только сборку DI-контейнера и вызов adapter'а.
 *
 * ВАЖНО про эту пачку: она НЕ меняет поведение на wire — 'initialize'
 * по-прежнему обрабатывается нашим собственным хендлером с хардкодом
 * protocolVersion (как было). Переход на serveStdio(), поддержку
 * 2026-07-28 и удаление хардкода — отдельная пачка 4.1.C.
 *
 * Владелец протокольных полей tools/list — этот файл, а не отдельные tools:
 * - фильтрация через `toolRegistry.getVisibleDefinitions()` — тот же объект
 *   accessPolicy, что спрашивает `toolRegistry.execute()` (см. tool-registry.ts);
 * - детерминированный порядок — контракт ToolSorter, тот же на каждый вызов;
 * - `cacheHints` для tools/list заранее консервативны (private, короткий TTL);
 *   при legacy-транспорте (текущее состояние) они не попадают на wire —
 *   2025-era ответы их не несут ни при каких условиях (SDK-инвариант).
 */

import { Server } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { ListToolsResult, CallToolResult } from '@modelcontextprotocol/server';

import { projectToolDefinitionsForList } from '../tool-registry/tools-list-projection.js';
import { normalizeToolName } from './normalize-tool-name.js';
import { calculateToolsMetrics, logToolsMetrics, logToolsWarnings } from './tools-metrics.js';
import { createToolCallErrorResponse } from './tool-call-error-response.js';
import type { McpServerAdapterOptions, McpServerAdapterHandle } from './types.js';

/** TTL консервативно короткий: набор инструментов зависит от конфигурации
 * конкретной установки (DISABLED_TOOL_GROUPS), общий посредник кешировать
 * не должен — отсюда и `cacheScope: 'private'`. */
const TOOLS_LIST_CACHE_TTL_MS = 30_000;

/**
 * Создать adapter MCP-сервера.
 */
export function createMcpServerAdapter(options: McpServerAdapterOptions): McpServerAdapterHandle {
  const { serverName, serverDisplayName, version, toolRegistry, logger } = options;

  const serverPrefixes = [
    `${serverName}:`,
    ...(serverDisplayName ? [`${serverDisplayName}:`] : []),
  ];

  const server = new Server(
    { name: serverName, version },
    {
      capabilities: { tools: {} },
      cacheHints: {
        'tools/list': { ttlMs: TOOLS_LIST_CACHE_TTL_MS, cacheScope: 'private' },
      },
    }
  );

  // Обработчик инициализации соединения (2025-era; см. заголовок файла).
  server.setRequestHandler('initialize', (request) => {
    const { clientInfo, protocolVersion } = request.params;

    logger.info(`🤝 Подключение MCP клиента`, {
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      protocolVersion,
    });

    return {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: serverName, version },
    };
  });

  // Обработчик запроса списка инструментов.
  server.setRequestHandler('tools/list', () => {
    logger.info(`📋 Запрос tools/list от клиента`);

    const definitions = toolRegistry.getVisibleDefinitions();

    const metrics = calculateToolsMetrics(definitions);
    logToolsMetrics(logger, definitions, metrics);
    logToolsWarnings(logger, metrics);

    // Наш JSON Schema 2020-12 генератор даёт валидный на wire объект, но его
    // TS-тип (Record<string, unknown> в properties) шире строгого
    // рекурсивного типа SDK — приведение на границе framework/SDK,
    // безопасное, т.к. форма проверена в рантайме (validate:tools + ajv).
    return { tools: projectToolDefinitionsForList(definitions) } as ListToolsResult;
  });

  // Обработчик вызова инструмента.
  server.setRequestHandler('tools/call', async (request) => {
    const originalName = request.params.name;
    const { arguments: args } = request.params;

    logger.info(`🔧 Запрос инструмента: ${originalName}`);

    const { name, removedPrefix } = normalizeToolName(originalName, serverPrefixes, logger);

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

      // ToolResult (наш внутренний тип) — совместимая по форме, но не
      // номинально типизированная как CallToolResult SDK; приведение на
      // границе framework/SDK по тем же причинам, что и у tools/list выше.
      return result as unknown as CallToolResult;
    } catch (error) {
      logger.error(`💥 Необработанное исключение при выполнении инструмента ${name}:`, {
        originalName,
        normalizedName: name,
        removedPrefix,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return createToolCallErrorResponse(error, name, originalName) as unknown as CallToolResult;
    }
  });

  server.onerror = (error): void => {
    logger.error('Ошибка MCP сервера:', error);
  };

  function setupSignalHandlers(): void {
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

  return {
    async start(): Promise<void> {
      setupSignalHandlers();
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
