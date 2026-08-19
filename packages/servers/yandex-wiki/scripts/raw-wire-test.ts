#!/usr/bin/env tsx
/**
 * Raw-wire тесты MCP-протокола для Yandex Wiki.
 *
 * Транспортный низ (спавн бандла, чтение stdout без порчи UTF-8, ожидание
 * ответа по id, останов, подставной HTTP-API) — в общем харнессе
 * `packages/servers/scripts/mcp-wire-harness/`. Сценарии остаются здесь и
 * продолжают говорить СЫРЫМИ БАЙТАМИ JSON-RPC: их предмет — поведение самого
 * SDK (negotiation эпох, коды ошибок, реакция на неполный `_meta`), и прогон
 * через клиент того же SDK превратил бы проверку в тавтологию.
 *
 * ВАЖНО про сценарий 4: era и версия протокола валидируются SDK один раз
 * при открытии соединения (первое сообщение), а не на каждый запрос —
 * "no per-request era consult" (см. create-mcp-server-adapter.ts). Поэтому
 * неподдерживаемую версию нужно слать именно ПЕРВЫМ сообщением НОВОГО
 * соединения — на уже открытом modern-соединении она будет проигнорирована.
 *
 * СЦЕНАРИИ СБОЕВ ТРАНСПОРТА (10-13): локальный HTTP-сервер подставляется
 * через YANDEX_WIKI_API_BASE (см. src/config/constants.ts, ENV_VAR_NAMES).
 * Retry/error mapping (axios-http-client.ts, retry-handler.ts) — общий
 * framework-код, поведение при сбоях принципиально не отличается от Tracker.
 */

import {
  ScenarioRunner,
  assert,
  assertNoDecodingDamage,
  createWithServer,
  describeToolsListMismatch,
  legacyInitialize,
  modernMeta,
  normalizeVolatileContent,
  FakeApiServer,
  sendJson,
} from '../../scripts/mcp-wire-harness/index.js';

// ---------------------------------------------------------------------------
// Конфигурация конкретного сервера (единственное, что отличается между
// тремя наборами сценариев)
// ---------------------------------------------------------------------------
const SERVER_LABEL = 'Yandex Wiki';
const BUNDLE_PATH = 'dist/yandex-wiki.bundle.cjs';
const BASE_ENV: Record<string, string> = {
  YANDEX_WIKI_TOKEN: 'OAuth dummy-token-for-raw-wire-test',
  YANDEX_ORG_ID: '123456',
};
const PING_TOOL = 'yw_ping';
const DISABLED_CATEGORY = 'resources';
const DISABLED_TOOL = 'yw_get_resources';
// ---------------------------------------------------------------------------

const withServer = createWithServer({
  label: SERVER_LABEL,
  bundlePath: BUNDLE_PATH,
  baseEnv: BASE_ENV,
});
const runner = new ScenarioRunner(SERVER_LABEL);

async function main(): Promise<void> {
  console.log(`🔌 Raw-wire тесты MCP-протокола: ${SERVER_LABEL}\n`);

  await runner.run('1. Legacy: initialize → tools/list → tools/call работает как сейчас', () =>
    withServer(async (harness) => {
      const init = await legacyInitialize(harness, 1);
      assert(init.result, `initialize должен вернуть result, получено ${JSON.stringify(init)}`);
      assert(
        init.result.protocolVersion === '2025-06-18',
        `protocolVersion должен быть эхом клиентского запроса ('2025-06-18'), получено ${init.result.protocolVersion}`
      );
      assert(init.result.serverInfo?.name, 'serverInfo.name должен присутствовать');

      const list = await harness.request(2, 'tools/list');
      assert(
        Array.isArray(list.result?.tools) && list.result.tools.length > 0,
        `tools/list должен вернуть непустой массив, получено ${JSON.stringify(list)}`
      );

      const call = await harness.request(3, 'tools/call', { name: PING_TOOL, arguments: {} });
      assert(
        Array.isArray(call.result?.content),
        `tools/call должен вернуть content, получено ${JSON.stringify(call)}`
      );
    })
  );

  await runner.run(
    '2. Modern: server/discover возвращает версии, capabilities и идентичность',
    () =>
      withServer(async (harness) => {
        const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
        assert(
          discover.result,
          `server/discover должен вернуть result, получено ${JSON.stringify(discover)}`
        );
        assert(
          Array.isArray(discover.result.supportedVersions) &&
            discover.result.supportedVersions.includes('2026-07-28'),
          `supportedVersions должен включать '2026-07-28', получено ${JSON.stringify(discover.result.supportedVersions)}`
        );
        assert(discover.result.capabilities?.tools, 'capabilities.tools должен присутствовать');
        assert(
          discover.result._meta?.['io.modelcontextprotocol/serverInfo']?.name,
          '_meta["io.modelcontextprotocol/serverInfo"].name (идентичность сервера) должен присутствовать'
        );

        // Пакет 3.1.D: иконка сервера едет ИМЕННО в server/discover — PNG
        // обязателен, SVG рядом, обе как data: URI.
        const icons = discover.result._meta?.['io.modelcontextprotocol/serverInfo']?.icons;
        assert(
          Array.isArray(icons) && icons.length >= 2,
          `icons (пакет 3.1.D) должен содержать минимум 2 записи, получено ${JSON.stringify(icons)}`
        );
        assert(
          icons.some(
            (icon: { mimeType?: string; src?: string }) =>
              icon.mimeType === 'image/png' && icon.src?.startsWith('data:image/png;base64,')
          ),
          `icons должен содержать PNG как data: URI, получено ${JSON.stringify(icons)}`
        );
        assert(
          icons.some(
            (icon: { mimeType?: string; src?: string }) =>
              icon.mimeType === 'image/svg+xml' &&
              icon.src?.startsWith('data:image/svg+xml;base64,')
          ),
          `icons должен содержать SVG как data: URI, получено ${JSON.stringify(icons)}`
        );

        // Негативный ассерт (M1): иконки — особенность ИМЕННО server/discover,
        // держится на патче приватного _ondiscover (см. discover-server-info.ts).
        // Если SDK поменяет правило "handler — более специфичный автор _meta" —
        // иконка либо пропадёт из discover, либо тихо просочится в обычные
        // ответы. Проверяем оба конца: обычный tools/list той же сессии НЕ
        // несёт icons в своём _meta.serverInfo.
        const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
        const listServerInfo = list.result?._meta?.['io.modelcontextprotocol/serverInfo'];
        assert(
          listServerInfo?.icons === undefined,
          `tools/list: _meta["io.modelcontextprotocol/serverInfo"].icons НЕ должен ` +
            `присутствовать (icons — только на server/discover), получено ${JSON.stringify(listServerInfo?.icons)}`
        );
      })
  );

  await runner.run('3. Modern: запрос без обязательных полей _meta → -32602', () =>
    withServer(async (harness) => {
      // Валидная открывающая — пинит соединение на modern-эру.
      await harness.request(1, 'server/discover', { _meta: modernMeta() });

      // Второй запрос заявляет модерн (protocolVersion есть), но не несёт
      // остальной обязательный envelope (clientInfo/clientCapabilities).
      const incomplete = await harness.request(2, 'tools/list', {
        _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
      });
      assert(
        incomplete.error?.code === -32602,
        `ожидался код -32602 (Invalid Params), получено ${JSON.stringify(incomplete)}`
      );
    })
  );

  await runner.run('4. Неподдерживаемая версия на открывающем сообщении → -32022', () =>
    withServer(async (harness) => {
      const response = await harness.request(1, 'tools/list', {
        _meta: modernMeta({ 'io.modelcontextprotocol/protocolVersion': '9999-01-01' }),
      });
      assert(
        response.error?.code === -32022,
        `ожидался код -32022 (UnsupportedProtocolVersion), получено ${JSON.stringify(response)}`
      );
      // response.error.data типизирован как unknown (JsonRpcError) — оптional
      // chaining по unknown сужает промежуточный тип до '{}' (без индексной
      // сигнатуры), поэтому явный каст перед доступом к 'supported'.
      const errorData = response.error?.data as { supported?: unknown } | undefined;
      assert(
        Array.isArray(errorData?.supported),
        `error.data.supported должен перечислять поддерживаемые версии, получено ${JSON.stringify(errorData)}`
      );
    })
  );

  await runner.run(
    '5. Каждый успешный результат содержит resultType и serverInfo в _meta; icons (3.1.D) — только на discover',
    () =>
      withServer(async (harness) => {
        const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
        const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
        const call = await harness.request(3, 'tools/call', {
          name: PING_TOOL,
          arguments: {},
          _meta: modernMeta(),
        });

        for (const [label, msg, expectIcons] of [
          ['server/discover', discover, true],
          ['tools/list', list, false],
          ['tools/call', call, false],
        ] as const) {
          assert(
            msg.result?.resultType === 'complete',
            `${label}: resultType должен быть 'complete', получено ${JSON.stringify(msg.result?.resultType)}`
          );
          const serverInfo = msg.result?._meta?.['io.modelcontextprotocol/serverInfo'];
          assert(
            serverInfo?.name,
            `${label}: _meta["io.modelcontextprotocol/serverInfo"] должен присутствовать`
          );

          // Пакет 3.1.D: иконка едет один раз, в server/discover — per-response
          // serverInfo обычных результатов её НЕ несёт (иначе она осядет в
          // клиентском mcp.log и в нашем Pino на каждый вызов).
          if (expectIcons) {
            assert(
              Array.isArray(serverInfo.icons) && serverInfo.icons.length > 0,
              `${label}: _meta["io.modelcontextprotocol/serverInfo"].icons должен присутствовать, получено ${JSON.stringify(serverInfo.icons)}`
            );
          } else {
            assert(
              serverInfo.icons === undefined,
              `${label}: _meta["io.modelcontextprotocol/serverInfo"].icons НЕ должен присутствовать (пакет 3.1.D), получено ${JSON.stringify(serverInfo.icons)}`
            );
          }
        }
      })
  );

  await runner.run('6. tools/list содержит ttlMs и cacheScope', () =>
    withServer(async (harness) => {
      await harness.request(1, 'server/discover', { _meta: modernMeta() });
      const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
      assert(
        typeof list.result?.ttlMs === 'number',
        `ttlMs должен быть числом, получено ${JSON.stringify(list.result?.ttlMs)}`
      );
      assert(
        list.result?.cacheScope === 'private',
        `cacheScope должен быть 'private', получено ${JSON.stringify(list.result?.cacheScope)}`
      );
    })
  );

  await runner.run('7. Два последовательных tools/list дают побайтово одинаковый список', () =>
    withServer(async (harness) => {
      await harness.request(1, 'server/discover', { _meta: modernMeta() });
      const first = await harness.request(2, 'tools/list', { _meta: modernMeta() });
      const second = await harness.request(3, 'tools/list', { _meta: modernMeta() });
      assertNoDecodingDamage('tools/list', JSON.stringify(first.result?.tools));
      const mismatch = describeToolsListMismatch(first.result?.tools, second.result?.tools);
      if (mismatch !== undefined) {
        console.log(mismatch);
        throw new Error(`два последовательных tools/list вернули разные списки tools\n${mismatch}`);
      }
    })
  );

  await runner.run(
    '8. Один и тот же tools/call в обеих эпохах даёт одинаковый результат',
    async () => {
      const legacy = await withServer(async (harness) => {
        await legacyInitialize(harness, 1);
        const call = await harness.request(2, 'tools/call', { name: PING_TOOL, arguments: {} });
        return call.result;
      });

      const modern = await withServer(async (harness) => {
        await harness.request(1, 'server/discover', { _meta: modernMeta() });
        const call = await harness.request(2, 'tools/call', {
          name: PING_TOOL,
          arguments: {},
          _meta: modernMeta(),
        });
        return call.result;
      });

      assert(legacy && modern, 'оба вызова должны вернуть result');
      assert(
        normalizeVolatileContent(legacy.content) === normalizeVolatileContent(modern.content),
        `content должен совпадать между эпохами (после нормализации таймстампов):\n  legacy=${JSON.stringify(legacy.content)}\n  modern=${JSON.stringify(modern.content)}`
      );
      assert(
        Boolean(legacy.isError) === Boolean(modern.isError),
        `isError должен совпадать между эпохами: legacy=${legacy.isError} modern=${modern.isError}`
      );
    }
  );

  await runner.run('9. Отказ policy (этап 1) одинаков в обеих эпохах', async () => {
    const envOverrides = { DISABLED_TOOL_GROUPS: DISABLED_CATEGORY };

    const legacy = await withServer(async (harness) => {
      await legacyInitialize(harness, 1);
      const call = await harness.request(2, 'tools/call', { name: DISABLED_TOOL, arguments: {} });
      return call.result;
    }, envOverrides);

    const modern = await withServer(async (harness) => {
      await harness.request(1, 'server/discover', { _meta: modernMeta() });
      const call = await harness.request(2, 'tools/call', {
        name: DISABLED_TOOL,
        arguments: {},
        _meta: modernMeta(),
      });
      return call.result;
    }, envOverrides);

    assert(
      legacy?.isError === true,
      `legacy: вызов отключённого инструмента должен вернуть isError:true, получено ${JSON.stringify(legacy)}`
    );
    assert(
      modern?.isError === true,
      `modern: вызов отключённого инструмента должен вернуть isError:true, получено ${JSON.stringify(modern)}`
    );
    assert(
      JSON.stringify(legacy.content) === JSON.stringify(modern.content),
      `текст отказа должен совпадать между эпохами:\n  legacy=${JSON.stringify(legacy.content)}\n  modern=${JSON.stringify(modern.content)}`
    );
  });

  await runner.run(
    '10. Мутирующий POST (update_page) не повторяется при 503 (неопределённый исход), ошибка несёт подсказку про возможное выполнение',
    async () => {
      const fake = new FakeApiServer((_request, res) => {
        sendJson(res, 503, { message: 'Service temporarily unavailable' });
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'yw_update_page',
              // Без content: намеренно, чтобы не спровоцировать
              // дополнительный GET (detectMarkupLoss читает текущую страницу
              // ПЕРЕД записью только когда content передан — см.
              // update-page.tool.ts) — иначе подставной API получит 2
              // запроса вместо 1, и ассерт "не повторяется" станет ложным
              // срабатыванием по не той причине.
              arguments: { idx: 1, title: 'Raw-wire test' },
            });
          },
          { YANDEX_WIKI_API_BASE: apiBase }
        );

        assert(
          fake.requests.length === 1,
          `неидемпотентный POST не должен повторяться на 503: подставной API получил ${fake.requests.length} запрос(ов), ожидался 1`
        );
        assert(
          call.result?.isError === true,
          `ожидался isError:true, получено ${JSON.stringify(call.result)}`
        );
        const payload = JSON.parse(call.result.content?.[0]?.text ?? '{}') as {
          error?: { statusCode?: number; message?: string };
        };
        assert(
          payload.error?.statusCode === 503,
          `error.statusCode должен быть 503, получено ${JSON.stringify(payload.error)}`
        );
        assert(
          typeof payload.error?.message === 'string' &&
            payload.error.message.includes('Повтор отключён') &&
            payload.error.message.includes('дубль'),
          `сообщение об ошибке должно подсказывать про возможное выполнение операции и отключённый повтор, получено ${JSON.stringify(payload.error?.message)}`
        );
      } finally {
        await fake.stop();
      }
    }
  );

  await runner.run(
    '11. Читающий POST (`search`, idempotencyDeclared:true) повторяется при 503',
    async () => {
      const fake = new FakeApiServer((_request, res, callIndex) => {
        if (callIndex === 1) {
          sendJson(res, 503, { message: 'Service temporarily unavailable' });
          return;
        }
        sendJson(res, 200, { results: [] });
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'yw_search',
              arguments: { query: 'Test' },
            });
          },
          {
            YANDEX_WIKI_API_BASE: apiBase,
            YANDEX_WIKI_RETRY_MIN_DELAY: '100',
          }
        );

        assert(
          fake.requests.length === 2,
          `идемпотентный (читающий) POST должен повториться один раз после 503: подставной API получил ${fake.requests.length} запрос(ов), ожидалось 2`
        );
        assert(
          call.result?.isError !== true,
          `после успешного повтора tools/call НЕ должен быть isError, получено ${JSON.stringify(call.result)}`
        );
      } finally {
        await fake.stop();
      }
    }
  );

  await runner.run(
    '12. Ошибка API доходит до клиента как isError:true с message/statusCode/errorsData',
    async () => {
      const fakeErrorsData = { idx: 1, reason: 'permission denied' };
      const fake = new FakeApiServer((_request, res) => {
        sendJson(res, 400, { message: 'Invalid update', errorsData: fakeErrorsData });
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'yw_update_page',
              arguments: { idx: 1, title: 'Raw-wire test' },
            });
          },
          { YANDEX_WIKI_API_BASE: apiBase }
        );

        assert(
          fake.requests.length === 1,
          `400 не является повторяемым статусом: подставной API получил ${fake.requests.length} запрос(ов), ожидался 1`
        );
        assert(
          call.result?.isError === true,
          `ожидался isError:true, получено ${JSON.stringify(call.result)}`
        );
        const payload = JSON.parse(call.result.content?.[0]?.text ?? '{}') as {
          error?: { statusCode?: number; message?: string; errorsData?: unknown };
        };
        assert(
          payload.error?.statusCode === 400,
          `error.statusCode должен быть 400, получено ${JSON.stringify(payload.error)}`
        );
        assert(
          typeof payload.error?.message === 'string' &&
            payload.error.message.includes('Invalid update'),
          `error.message должен сохранить текст ошибки API, получено ${JSON.stringify(payload.error?.message)}`
        );
        assert(
          JSON.stringify(payload.error?.errorsData) === JSON.stringify(fakeErrorsData),
          `error.errorsData должен дойти до клиента без потерь, получено ${JSON.stringify(payload.error?.errorsData)}`
        );
      } finally {
        await fake.stop();
      }
    }
  );

  await runner.run(
    '13. Таймаут: API не отвечает — клиент получает понятную сетевую ошибку',
    async () => {
      const fake = new FakeApiServer(() => {
        // Намеренно не отвечаем — сервер должен дождаться таймаута axios.
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'yw_raw_api_request',
              arguments: { method: 'GET', path: '/v1/pages/1', fields: ['id'] },
            });
          },
          {
            YANDEX_WIKI_API_BASE: apiBase,
            REQUEST_TIMEOUT: '5000',
            YANDEX_WIKI_RETRY_ATTEMPTS: '0',
          }
        );

        assert(
          call.result?.isError === true,
          `ожидался isError:true при таймауте, получено ${JSON.stringify(call.result)}`
        );
        const payload = JSON.parse(call.result.content?.[0]?.text ?? '{}') as {
          error?: { statusCode?: number; message?: string };
        };
        assert(
          payload.error?.statusCode === 0,
          `таймаут должен маппиться в NETWORK_ERROR (statusCode 0), получено ${JSON.stringify(payload.error)}`
        );
        assert(
          typeof payload.error?.message === 'string' && payload.error.message.length > 0,
          `сообщение об ошибке таймаута должно быть непустым, получено ${JSON.stringify(payload.error?.message)}`
        );
        assert(
          fake.requests.length === 1,
          `при RETRY_ATTEMPTS=0 ожидался ровно 1 запрос к подставному API, получено ${fake.requests.length}`
        );
      } finally {
        await fake.stop();
      }
    }
  );

  runner.finish();
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
