/**
 * Строит один инстанс `Server` со всеми зарегистрированными хендлерами
 * (пакеты 4.1.B/C, 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Вынесено из `createMcpServerAdapter` отдельной функцией по двум причинам:
 * (1) `serveStdio` вызывает фабрику `() => buildMcpServer(options)` один раз
 * НА КАЖДОЕ соединение — сама фабрика не должна знать про транспорт;
 * (2) тестируемость — `buildMcpServer` можно подключить к
 * `InMemoryTransport.createLinkedPair()` напрямую (см.
 * tests/mcp-server-adapter/resources.wire.test.ts), не поднимая реальный
 * STDIO-процесс, как это делают raw-wire скрипты трёх серверов.
 *
 * Владелец протокольных полей (`resultType`, `_meta.serverInfo`, `ttlMs`/
 * `cacheScope`, коды `-32022`/`-32602`) — SDK через `cacheHints`/`serveStdio`,
 * не код этого файла (см. заголовок create-mcp-server-adapter.ts).
 */

import { Server, ResourceNotFoundError } from '@modelcontextprotocol/server';
import type {
  ListToolsResult,
  CallToolResult,
  Implementation,
  ListResourcesResult,
  ReadResourceResult,
  ReadResourceRequestParams,
  ListResourceTemplatesResult,
} from '@modelcontextprotocol/server';

import { projectToolDefinitionsForList } from '../tool-registry/tools-list-projection.js';
import { ResourceRegistry } from '../resources/index.js';
import { normalizeToolName } from './normalize-tool-name.js';
import { calculateToolsMetrics, logToolsMetrics, logToolsWarnings } from './tools-metrics.js';
import { createToolCallErrorResponse } from './tool-call-error-response.js';
import { patchDiscoverServerInfo, type DiscoverableServer } from './discover-server-info.js';
import { SERVER_ICONS } from './server-icons.js';
import type { McpServerAdapterOptions } from './types.js';

/** TTL консервативно короткий: набор инструментов зависит от конфигурации
 * конкретной установки (DISABLED_TOOL_GROUPS), общий посредник кешировать
 * не должен — отсюда и `cacheScope: 'private'`. Применяется только на
 * 2026-07-28 (см. заголовок файла) — 2025-era ответы эти поля не несут. */
const TOOLS_LIST_CACHE_TTL_MS = 30_000;

/** Списки ресурсов (resources/list, resources/templates/list) зависят от
 * состава зарегистрированных провайдеров конкретной установки — тот же
 * консервативный `private`/короткий TTL, что и у tools/list. */
const RESOURCES_LIST_CACHE_TTL_MS = 30_000;

/** Содержимое ресурса (resources/read) может измениться на источнике
 * (задача Трекера, страница Wiki) быстрее, чем состав списка — TTL короче
 * списочных ответов. */
const RESOURCES_READ_CACHE_TTL_MS = 10_000;

/**
 * Строит инстанс `Server` — вызывается `serveStdio` один раз на соединение;
 * тот же код регистрации handlers обслуживает обе эпохи (2025 и 2026-07-28).
 */
export function buildMcpServer(options: McpServerAdapterOptions): Server {
  const { serverName, serverDisplayName, version, toolRegistry, logger } = options;
  // Пустой реестр по умолчанию (пакет 5.1.A): composition root сервера ещё
  // может не регистрировать ни одного ResourceProvider (следующая волна —
  // пакет 5.1.C) — `resources/list`/`resources/templates/list` тогда честно
  // отвечают пустым списком, `resources/read` — `ResourceNotFoundError` на
  // любой uri, а НЕ "Method not found": капабилити `resources` объявлена
  // безусловно (см. ниже), и спека требует хендлер на каждую объявленную
  // капабилити.
  const resourceRegistry = options.resourceRegistry ?? new ResourceRegistry();

  const serverPrefixes = [
    `${serverName}:`,
    ...(serverDisplayName ? [`${serverDisplayName}:`] : []),
  ];

  // Идентичность БЕЗ icons: это то, что SDK штампует в `_meta.serverInfo`
  // каждого обычного результата (см. discover-server-info.ts, шапка).
  const server = new Server(
    { name: serverName, version },
    {
      capabilities: { tools: {}, resources: {} },
      cacheHints: {
        'tools/list': { ttlMs: TOOLS_LIST_CACHE_TTL_MS, cacheScope: 'private' },
        'resources/list': { ttlMs: RESOURCES_LIST_CACHE_TTL_MS, cacheScope: 'private' },
        'resources/templates/list': { ttlMs: RESOURCES_LIST_CACHE_TTL_MS, cacheScope: 'private' },
        'resources/read': { ttlMs: RESOURCES_READ_CACHE_TTL_MS, cacheScope: 'private' },
      },
    }
  );

  // Идентичность С icons — только для `server/discover` (пакет 3.1.D).
  // Патчит приватный `_ondiscover()` инстанса; обоснование — в
  // discover-server-info.ts.
  const discoverIdentity: Implementation = { name: serverName, version, icons: SERVER_ICONS };
  patchDiscoverServerInfo(server as unknown as DiscoverableServer, discoverIdentity);

  registerToolHandlers(server, toolRegistry, serverPrefixes, logger);
  registerResourceHandlers(server, resourceRegistry, logger);

  // Логирование факта завершения legacy-рукопожатия (notifications/initialized).
  // На 2026-07-28 аналога этому событию нет (server/discover — однократный
  // синхронный запрос-ответ, без отдельного notification "готово") — это не
  // потеря функциональности, просто нет эквивалентного события на wire.
  server.oninitialized = (): void => {
    logger.info(`🤝 Подключение MCP клиента (legacy)`, {
      clientVersion: server.getClientVersion(),
      protocolVersion: server.getNegotiatedProtocolVersion(),
    });
  };

  server.onerror = (error): void => {
    logger.error('Ошибка MCP сервера:', error);
  };

  return server;
}

/**
 * Регистрирует `tools/list`/`tools/call` — перенесено без изменения
 * поведения из прежнего `createMcpServerAdapter` (пакет 4.1.B).
 */
function registerToolHandlers(
  server: Server,
  toolRegistry: McpServerAdapterOptions['toolRegistry'],
  serverPrefixes: readonly string[],
  logger: McpServerAdapterOptions['logger']
): void {
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
}

/**
 * Регистрирует `resources/list`/`resources/read`/`resources/templates/list`
 * (пакет 5.1.A). В отличие от `tools/call`, ошибки НЕ конвертируются в
 * `isError:true` — resources-методы отвечают протокольной JSON-RPC ошибкой
 * (например, `ResourceNotFoundError` → `-32602` на любой ревизии протокола,
 * см. `ResourceRegistry.readResource`), поэтому хендлер их пробрасывает, а
 * не перехватывает молча.
 */
function registerResourceHandlers(
  server: Server,
  resourceRegistry: ResourceRegistry,
  logger: McpServerAdapterOptions['logger']
): void {
  server.setRequestHandler('resources/list', async (request) => {
    const cursor = (request.params as { cursor?: string } | undefined)?.cursor;
    logger.info(`📚 Запрос resources/list от клиента`, { hasCursor: cursor !== undefined });

    const page = await resourceRegistry.listResources(cursor);

    return {
      resources: page.resources,
      ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
    } as ListResourcesResult;
  });

  server.setRequestHandler('resources/read', async (request) => {
    const { uri } = request.params as ReadResourceRequestParams;
    logger.info(`📄 Запрос resources/read: ${uri}`);

    try {
      const contents = await resourceRegistry.readResource(uri);
      logger.info(`✅ resources/read успешно: ${uri}`);
      return { contents } as ReadResourceResult;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        logger.warn(`⚠️ resources/read: ресурс не найден: ${uri}`);
      } else {
        logger.error(`💥 resources/read: ошибка провайдера: ${uri}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      // Проброс наверх: SDK сериализует ResourceNotFoundError как -32602 на
      // любой ревизии протокола (encode seam), любую другую ошибку — как
      // -32603 Internal Error. Конвертировать в isError:true здесь было бы
      // неверно — resources/read не tools/call, отказ обязан быть
      // протокольной ошибкой, а не текстовым результатом.
      throw error;
    }
  });

  server.setRequestHandler('resources/templates/list', async () => {
    logger.info(`📑 Запрос resources/templates/list от клиента`);

    const resourceTemplates = await resourceRegistry.listTemplates();

    return { resourceTemplates } as ListResourceTemplatesResult;
  });
}
