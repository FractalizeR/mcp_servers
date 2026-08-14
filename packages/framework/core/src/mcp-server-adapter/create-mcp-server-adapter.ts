/**
 * Общий adapter жизненного цикла и транспорта MCP-сервера (пакеты 4.1.B/C
 * плана модернизации MCP 2026-07-28).
 *
 * Выносит в framework то, что было почти дословно продублировано в трёх
 * server.ts (yandex-tracker, yandex-wiki, ticktick): создание Server,
 * регистрацию хендлеров tools/list/tools/call, нормализацию имени
 * инструмента, метрики и предупреждения tools/list, подключение
 * stdio-транспорта в обеих протокольных эпохах и обработчики сигналов
 * завершения. Три server.ts после этого содержат только сборку
 * DI-контейнера и вызов adapter'а.
 *
 * ДВЕ ЭПОХИ (пакет 4.1.C): вход — `serveStdio(() => buildServer())`. Одна
 * фабрика пинится на соединение при первом сообщении; эпоха выбирается
 * рукопожатием (`initialize` → 2025-era, `server/discover` → 2026-07-28) —
 * это владение SDK, не наше. `legacy: 'serve'` (по умолчанию) — обе эпохи
 * обслуживаются; `legacy: 'reject'` НЕ используем: Codex CLI ниже
 * v0.147.0 (и v0.147.0+ в дефолтном режиме, без
 * `CODEX_MCP_PROTOCOL_VERSION=2026-07-28`) говорит только 2025-era.
 *
 * СОБСТВЕННОГО хендлера 'initialize' у adapter'а больше нет: встроенный
 * хендлер Server (SDK) автоматически негоциирует protocolVersion из
 * SUPPORTED_PROTOCOL_VERSIONS и штампует serverInfo/capabilities — именно
 * поэтому хардкод `protocolVersion: '2025-06-18'` пакета 4.1.B здесь
 * исчезает. 'server/discover' (2026-07-28) регистрирует SDK сам —
 * отдельного `setRequestHandler` для него нет; adapter лишь патчит
 * приватный `_ondiscover()` инстанса, чтобы вложить `icons` в `_meta`
 * ТОЛЬКО этого ответа (пакет 3.1.D, см. discover-server-info.ts — там же
 * обоснование, почему `icons` нельзя просто добавить в идентичность
 * конструктора Server).
 *
 * Владелец протокольных полей на 2026-07-28 — SDK, не мы: `resultType` и
 * `_meta['io.modelcontextprotocol/serverInfo']` на каждом результате,
 * `ttlMs`/`cacheScope` на tools/list (см. `cacheHints` ниже),
 * `-32022 UnsupportedProtocolVersion` на неподдерживаемую версию,
 * `-32602` на модерн-запрос с неполным `_meta` — всё это встроенное
 * поведение `Server` при использовании `serveStdio`, не код этого файла
 * (проверено эмпирически: raw-wire пробник, см. отчёт пакета 4.1.D).
 *
 * Уровень логирования per-request (`io.modelcontextprotocol/logLevel`) нас
 * не касается: мы никогда не отправляли `notifications/message` (deprecated
 * MCP Logging) — логируем в Pino/stderr, как и рекомендует спека 2026-07-28
 * взамен этого канала. Менять здесь нечего.
 *
 * Владелец видимости tools/list — тот же объект `accessPolicy`, что
 * спрашивает `toolRegistry.execute()` при tools/call (см. tool-registry.ts,
 * `getVisibleDefinitions()`), и детерминированный порядок — контракт
 * `ToolSorter`, тот же на каждый вызов.
 */

import { Server } from '@modelcontextprotocol/server';
import type { ListToolsResult, CallToolResult, Implementation } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { projectToolDefinitionsForList } from '../tool-registry/tools-list-projection.js';
import { normalizeToolName } from './normalize-tool-name.js';
import { calculateToolsMetrics, logToolsMetrics, logToolsWarnings } from './tools-metrics.js';
import { createToolCallErrorResponse } from './tool-call-error-response.js';
import { patchDiscoverServerInfo, type DiscoverableServer } from './discover-server-info.js';
import { SERVER_ICONS } from './server-icons.js';
import type { McpServerAdapterOptions, McpServerAdapterHandle } from './types.js';

/** TTL консервативно короткий: набор инструментов зависит от конфигурации
 * конкретной установки (DISABLED_TOOL_GROUPS), общий посредник кешировать
 * не должен — отсюда и `cacheScope: 'private'`. Применяется только на
 * 2026-07-28 (см. заголовок файла) — 2025-era ответы эти поля не несут. */
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

  /**
   * Фабрика инстанса Server — вызывается serveStdio один раз на соединение;
   * тот же код регистрации handlers обслуживает обе эпохи (2025 и
   * 2026-07-28), SDK решает, какую эпоху пинить, до вызова фабрики нам не
   * известно.
   */
  function buildServer(): Server {
    // Идентичность БЕЗ icons: это то, что SDK штампует в `_meta.serverInfo`
    // каждого обычного результата (см. discover-server-info.ts, шапка).
    const server = new Server(
      { name: serverName, version },
      {
        capabilities: { tools: {} },
        cacheHints: {
          'tools/list': { ttlMs: TOOLS_LIST_CACHE_TTL_MS, cacheScope: 'private' },
        },
      }
    );

    // Идентичность С icons — только для `server/discover` (пакет 3.1.D).
    // Патчит приватный `_ondiscover()` инстанса; обоснование — в
    // discover-server-info.ts.
    const discoverIdentity: Implementation = { name: serverName, version, icons: SERVER_ICONS };
    patchDiscoverServerInfo(server as unknown as DiscoverableServer, discoverIdentity);

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

  return {
    async start(): Promise<void> {
      const handle = serveStdio(() => buildServer(), {
        // Явно, а не полагаясь на умолчание: описано в заголовке файла —
        // Codex CLI по умолчанию говорит только 2025-era.
        legacy: 'serve',
        onerror: (error): void => {
          logger.error('Ошибка MCP-соединения (до пиннинга на эпоху):', error);
        },
      });

      const handleShutdown = (signal: string): void => {
        logger.info(`Получен сигнал ${signal}, завершение работы...`);
        void handle
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
    },
  };
}
