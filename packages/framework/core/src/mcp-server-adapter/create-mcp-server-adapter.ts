/**
 * Общий adapter жизненного цикла и транспорта MCP-сервера (пакеты 4.1.B/C,
 * 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Выносит в framework то, что было почти дословно продублировано в
 * server.ts каждого сервера (yandex-tracker, yandex-wiki): создание Server,
 * регистрацию хендлеров tools/list/tools/call/resources/*, нормализацию
 * имени инструмента, метрики и предупреждения tools/list, подключение
 * stdio-транспорта в обеих протокольных эпохах и обработчики сигналов
 * завершения. Каждый server.ts после этого содержит только сборку
 * DI-контейнера и вызов adapter'а.
 *
 * Сборка самого `Server` (регистрация handlers) вынесена в
 * `build-mcp-server.ts` — этот файл отвечает только за serveStdio/lifecycle.
 *
 * ДВЕ ЭПОХИ (пакет 4.1.C): вход — `serveStdio(() => buildMcpServer(options))`.
 * Одна фабрика пинится на соединение при первом сообщении; эпоха выбирается
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

import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { buildMcpServer } from './build-mcp-server.js';
import type { McpServerAdapterOptions, McpServerAdapterHandle } from './types.js';

/**
 * Создать adapter MCP-сервера.
 */
export function createMcpServerAdapter(options: McpServerAdapterOptions): McpServerAdapterHandle {
  const { logger } = options;

  return {
    async start(): Promise<void> {
      const handle = serveStdio(() => buildMcpServer(options), {
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
