#!/usr/bin/env tsx
/**
 * Raw-wire тесты MCP-протокола для Yandex Tracker.
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
 * СЦЕНАРИИ СБОЕВ ТРАНСПОРТА (10-13): единственный способ подсунуть сбой HTTP
 * реальному собранному бандлу, говорящему по stdio отдельным процессом, —
 * поднять локальный HTTP-сервер и направить процесс на него через
 * YANDEX_TRACKER_API_BASE (см. src/config/constants.ts, ENV_VAR_NAMES).
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
const SERVER_LABEL = 'Yandex Tracker';
const BUNDLE_PATH = 'dist/yandex-tracker.bundle.cjs';
const BASE_ENV: Record<string, string> = {
  YANDEX_TRACKER_TOKEN: 'dummy-token-for-raw-wire-test',
  YANDEX_ORG_ID: '123456',
};
const PING_TOOL = 'fr_yandex_tracker_ping';
// Единственный tool, который НЕ обращается к API Яндекс.Трекера (работает
// локально, без токена) — нужен сценарию 8 для проверки УСПЕШНОГО пути
// tools/call (ping с фиктивным токеном всегда падает по 401, поэтому
// годится только для проверки пути ошибки).
const SUCCESS_TOOL = 'fr_yandex_tracker_get_issue_urls';
const DISABLED_CATEGORY = 'issues';
const DISABLED_TOOL = 'fr_yandex_tracker_get_issues';
// Текст отказа policy (ConfiguredToolAccessPolicy.denialReason в
// @fractalizer/mcp-core/tool-registry/tool-access-policy.ts) — сценарий 9
// сверяет ИМЕННО эту подстроку, чтобы доказать, что isError вызван отказом
// policy, а не каким-то другим путём ошибки (например "tool не найден").
const POLICY_DENIAL_SUBSTRING = `Инструмент "${DISABLED_TOOL}" недоступен в текущей конфигурации сервера`;
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

        // НЕГАТИВНЫЙ ассерт (M1/M7 отчёта ревью): иконка едет ИСКЛЮЧИТЕЛЬНО в
        // server/discover. Держится на патче приватного _ondiscover SDK — без
        // этого теста регрессия (иконка тихо перестала осесть в discover ИЛИ
        // тихо начала протекать в tools/list) не была бы поймана, только
        // задокументирована чтением исходников SDK.
        const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
        const listServerInfo = list.result?._meta?.['io.modelcontextprotocol/serverInfo'];
        assert(
          listServerInfo?.icons === undefined,
          `НЕГАТИВНЫЙ ассерт: tools/list._meta["io.modelcontextprotocol/serverInfo"].icons НЕ должен ` +
            `присутствовать (иконка едет только в server/discover), получено ${JSON.stringify(listServerInfo?.icons)}`
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
      assert(
        Array.isArray(response.error?.data?.['supported']),
        `error.data.supported должен перечислять поддерживаемые версии, получено ${JSON.stringify(response.error?.data)}`
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
    '8. Один и тот же tools/call в обеих эпохах даёт одинаковый результат (ошибка И успех)',
    async () => {
      // 8a. Путь ОШИБКИ: ping с фиктивным токеном падает по 401 одинаково в
      // обеих эпохах — покрывает форму ошибки, но НЕ покрывает успешный путь
      // и сериализацию нетривиальных аргументов (см. 8b).
      const legacyError = await withServer(async (harness) => {
        await legacyInitialize(harness, 1);
        const call = await harness.request(2, 'tools/call', { name: PING_TOOL, arguments: {} });
        return call.result;
      });

      const modernError = await withServer(async (harness) => {
        await harness.request(1, 'server/discover', { _meta: modernMeta() });
        const call = await harness.request(2, 'tools/call', {
          name: PING_TOOL,
          arguments: {},
          _meta: modernMeta(),
        });
        return call.result;
      });

      assert(legacyError && modernError, '8a: оба вызова (путь ошибки) должны вернуть result');
      assert(
        normalizeVolatileContent(legacyError.content) ===
          normalizeVolatileContent(modernError.content),
        `8a: content (путь ошибки) должен совпадать между эпохами (после нормализации таймстампов):\n  legacy=${JSON.stringify(legacyError.content)}\n  modern=${JSON.stringify(modernError.content)}`
      );
      assert(
        Boolean(legacyError.isError) === Boolean(modernError.isError),
        `8a: isError (путь ошибки) должен совпадать между эпохами: legacy=${legacyError.isError} modern=${modernError.isError}`
      );

      // 8b. Путь УСПЕХА: get_issue_urls — единственный tool, НЕ обращающийся
      // к API (см. SUCCESS_TOOL), поэтому даёт настоящий успешный результат
      // даже с фиктивным токеном. Аргументы — массив из двух ключей: доказывает,
      // что НЕТРИВИАЛЬНЫЕ аргументы сериализуются и валидируются одинаково в
      // обеих эпохах, а не только "пустой arguments: {}" из 8a.
      const successArgs = { issueKeys: ['FRTEST-1', 'FRTEST-2'] };

      const legacySuccess = await withServer(async (harness) => {
        await legacyInitialize(harness, 1);
        const call = await harness.request(2, 'tools/call', {
          name: SUCCESS_TOOL,
          arguments: successArgs,
        });
        return call.result;
      });

      const modernSuccess = await withServer(async (harness) => {
        await harness.request(1, 'server/discover', { _meta: modernMeta() });
        const call = await harness.request(2, 'tools/call', {
          name: SUCCESS_TOOL,
          arguments: successArgs,
          _meta: modernMeta(),
        });
        return call.result;
      });

      assert(legacySuccess && modernSuccess, '8b: оба вызова (путь успеха) должны вернуть result');
      assert(
        legacySuccess.isError !== true && modernSuccess.isError !== true,
        `8b: путь успеха НЕ должен быть isError: legacy=${JSON.stringify(legacySuccess)} modern=${JSON.stringify(modernSuccess)}`
      );
      assert(
        JSON.stringify(legacySuccess.content) === JSON.stringify(modernSuccess.content),
        `8b: content (путь успеха) должен побайтово совпадать между эпохами:\n  legacy=${JSON.stringify(legacySuccess.content)}\n  modern=${JSON.stringify(modernSuccess.content)}`
      );

      const successText = legacySuccess.content?.[0]?.text;
      assert(
        typeof successText === 'string' &&
          successText.includes('FRTEST-1') &&
          successText.includes('FRTEST-2'),
        `8b: результат должен отражать ОБА переданных issueKeys (доказывает, что аргументы дошли до tool, а не что оба вызова случайно вернули одинаковую пустышку), получено ${JSON.stringify(successText)}`
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

    // M7: isError:true сам по себе не доказывает, что причина — именно
    // policy denial (а не, например, "tool не найден" или падение внутри
    // execute()). Сверяем ТЕКСТ отказа с ConfiguredToolAccessPolicy.denialReason
    // (@fractalizer/mcp-core/tool-registry/tool-access-policy.ts). content[0].text
    // сам — JSON-текст envelope { success, message }, поэтому парсим его, а не
    // ищем подстроку в сыром тексте (там кавычки вокруг имени tool экранированы).
    const legacyMessage = JSON.parse(legacy.content?.[0]?.text ?? '{}') as { message?: string };
    const modernMessage = JSON.parse(modern.content?.[0]?.text ?? '{}') as { message?: string };
    assert(
      typeof legacyMessage.message === 'string' &&
        legacyMessage.message.includes(POLICY_DENIAL_SUBSTRING),
      `legacy: message отказа должен содержать причину policy denial ("${POLICY_DENIAL_SUBSTRING}"), получено ${JSON.stringify(legacyMessage.message)}`
    );
    assert(
      typeof modernMessage.message === 'string' &&
        modernMessage.message.includes(POLICY_DENIAL_SUBSTRING),
      `modern: message отказа должен содержать причину policy denial ("${POLICY_DENIAL_SUBSTRING}"), получено ${JSON.stringify(modernMessage.message)}`
    );
  });

  await runner.run(
    '10. Мутирующий POST (transition) не повторяется при 503 (неопределённый исход), ошибка несёт подсказку про возможное выполнение',
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
              name: 'fr_yandex_tracker_transition_issue',
              arguments: { issueKey: 'FRTEST-1', transitionId: 'close' },
            });
          },
          { YANDEX_TRACKER_API_BASE: apiBase }
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
    '11. Читающий POST (`_search`, idempotencyDeclared:true) повторяется при 503',
    async () => {
      const fake = new FakeApiServer((_request, res, callIndex) => {
        if (callIndex === 1) {
          sendJson(res, 503, { message: 'Service temporarily unavailable' });
          return;
        }
        sendJson(res, 200, []);
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'fr_yandex_tracker_find_issues',
              arguments: { query: 'Test', fields: ['id'] },
            });
          },
          {
            YANDEX_TRACKER_API_BASE: apiBase,
            YANDEX_TRACKER_RETRY_MIN_DELAY: '100',
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
      const fakeErrorsData = { transitionId: 'close', reason: 'not applicable from this status' };
      const fake = new FakeApiServer((_request, res) => {
        sendJson(res, 400, { message: 'Invalid transition', errorsData: fakeErrorsData });
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'fr_yandex_tracker_transition_issue',
              arguments: { issueKey: 'FRTEST-1', transitionId: 'close' },
            });
          },
          { YANDEX_TRACKER_API_BASE: apiBase }
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
            payload.error.message.includes('Invalid transition'),
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
              name: 'fr_yandex_tracker_raw_api_request',
              arguments: { method: 'GET', path: '/v3/myself', fields: ['id'] },
            });
          },
          {
            YANDEX_TRACKER_API_BASE: apiBase,
            REQUEST_TIMEOUT: '5000',
            YANDEX_TRACKER_RETRY_ATTEMPTS: '0',
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
