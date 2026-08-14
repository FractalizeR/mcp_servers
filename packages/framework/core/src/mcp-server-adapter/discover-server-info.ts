/**
 * Иконка сервера в `server/discover`, но не в per-response `_meta.serverInfo`
 * (пакет 3.1.D плана модернизации MCP 2026-07-28).
 *
 * ПОЧЕМУ НЕЛЬЗЯ ПРОСТО ПОЛОЖИТЬ `icons` В КОНСТРУКТОР `Server`. SDK v2 хранит
 * ОДИН объект identity (`Server._serverInfo`, то, что передано первым
 * аргументом конструктора) и штампует его же в `_meta['io.modelcontextprotocol/serverInfo']`
 * КАЖДОГО результата (2026-07-28, `stampServerInfoMeta` в encode seam) — это
 * тот же самый объект, что уходит и в `server/discover`. Отдельного поля
 * "identity только для discover" в публичном API нет: `DiscoverResultSchema`
 * (2026-07-28) вообще не содержит `serverInfo` — идентичность там тоже едет
 * исключительно через `_meta`. Раздельные data URI на каждый ответ означали
 * бы дублирование иконки в клиентском `mcp.log` и в нашем Pino на каждый
 * вызов — именно то, чего пакет 3.1.D требует избежать.
 *
 * ПОЧЕМУ ЭТО ВСЁ ЖЕ ВОЗМОЖНО. `stampServerInfoMeta` не перезаписывает
 * `_meta[SERVER_INFO_META_KEY]`, если хендлер уже выставил его сам ("the
 * handler is the more specific author" — комментарий SDK). Значит хендлеру
 * `server/discover` достаточно самому положить в `_meta` identity с
 * `icons`, а автоштамп (`Server._outboundServerInfo()`, тот самый общий
 * `_serverInfo` без `icons`) на этот конкретный ответ уже не наложится.
 *
 * ПОЧЕМУ ПАТЧ ПРИВАТНОГО `_ondiscover()`, А НЕ `server.setRequestHandler(
 * 'server/discover', ...)`. Для `serveStdio` с явным `legacy: 'serve'`
 * (см. create-mcp-server-adapter.ts) SDK для КАЖДОГО modern-era соединения
 * переустанавливает свой хендлер `server/discover` ПОСЛЕ вызова фабрики,
 * которой был построен `Server` (`installModernOnlyHandlers` →
 * `installDiscoverHandler`, внутренности пакета `@modelcontextprotocol/server`,
 * `dist/stdio.mjs`/`dist/mcp-*.mjs`) — переопределение через
 * `setRequestHandler`, сделанное внутри фабрики, к этому моменту уже было бы
 * затёрто. Штатный хендлер каждый раз вызывает `server._ondiscover()`
 * заново — не захватывает ссылку на функцию при регистрации, — поэтому патч
 * САМОГО МЕТОДА на инстансе переживает переустановку хендлера, а патч
 * хендлера — нет. Эмпирически подтверждено чтением `dist/stdio.mjs` пакета
 * `@modelcontextprotocol/server@2.x` (см. отчёт пакета 3.1.D) и закреплено
 * raw-wire сценарием 2 каждого из трёх серверов.
 *
 * ХРУПКОСТЬ. `_ondiscover` — приватный по соглашению SDK (TS `private` в
 * `.d.ts`, обычный метод прототипа в скомпилированном JS — не `#private`,
 * поэтому доступен и патчибелен в рантайме), не публичный контракт.
 * `isDiscoverBaseResult` ниже проверяет форму на каждый вызов и бросает
 * понятную ошибку вместо тихой порчи ответа, если апдейт SDK эту форму
 * изменит; raw-wire сценарий 2 поймает регресс на первом же прогоне после
 * апдейта.
 */

import { SERVER_INFO_META_KEY } from '@modelcontextprotocol/server';
import type { Implementation } from '@modelcontextprotocol/server';

/**
 * Форма, которую приватный `_ondiscover()` возвращает на момент фиксации
 * пакета 3.1.D: `supportedVersions`/`capabilities` и опционально
 * `instructions` — без `_meta` и без cache-полей (`ttlMs`/`cacheScope`),
 * их заполняет encode seam SDK уже после хендлера.
 */
interface DiscoverBaseResult {
  supportedVersions: readonly string[];
  capabilities: unknown;
  instructions?: string;
}

/**
 * Минимальный контракт на инстанс `Server`, нужный патчу: приватный (по
 * соглашению SDK, не по языку) метод `_ondiscover()`. Через него, а не
 * через публичный API, SDK формирует тело ответа `server/discover` — см.
 * шапку файла.
 */
export interface DiscoverableServer {
  _ondiscover(): unknown;
}

function isDiscoverBaseResult(value: unknown): value is DiscoverBaseResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { supportedVersions?: unknown }).supportedVersions)
  );
}

/**
 * Патчит приватный `_ondiscover()` инстанса `Server` так, чтобы ответ
 * `server/discover` нёс `_meta[SERVER_INFO_META_KEY]` с `discoverIdentity`
 * (identity, включающая `icons`) — не трогая обычный автоштамп identity
 * (без `icons`) на прочих результатах. Обоснование — см. шапку файла.
 *
 * Вызывать один раз на каждый построенный инстанс `Server`, до передачи его
 * `serveStdio`/фабрике транспорта.
 */
export function patchDiscoverServerInfo(
  server: DiscoverableServer,
  discoverIdentity: Implementation
): void {
  const originalOndiscover = server._ondiscover.bind(server);

  server._ondiscover = (): unknown => {
    const base: unknown = originalOndiscover();

    if (!isDiscoverBaseResult(base)) {
      throw new Error(
        'createMcpServerAdapter: Server._ondiscover() вернул неожиданную форму — ' +
          'приватный контракт SDK изменился, patchDiscoverServerInfo (discover-server-info.ts) надо обновить'
      );
    }

    return {
      ...base,
      _meta: { [SERVER_INFO_META_KEY]: discoverIdentity },
    };
  };
}
