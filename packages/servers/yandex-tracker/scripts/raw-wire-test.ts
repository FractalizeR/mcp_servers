#!/usr/bin/env tsx
/**
 * Raw-wire тесты MCP-протокола (пакет 4.1.D плана модернизации MCP 2026-07-28)
 *
 * Говорит с РЕАЛЬНЫМ собранным бандлом байтами JSON-RPC по stdio (как
 * scripts/smoke-test-server.ts), а не через внутренние API. Девять
 * сценариев из плана — по одному набору на каждый из трёх серверов.
 * Не покрывает поведение, реализованное внутри самого SDK, кроме как
 * через наблюдаемый эффект на wire (это и есть цель этих тестов).
 *
 * ВАЖНО про сценарий 4: era и версия протокола валидируются SDK один раз
 * при открытии соединения (первое сообщение), а не на каждый запрос —
 * "no per-request era consult" (см. create-mcp-server-adapter.ts). Поэтому
 * неподдерживаемую версию нужно слать именно ПЕРВЫМ сообщением НОВОГО
 * соединения — на уже открытом modern-соединении она будет проигнорирована.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// ---------------------------------------------------------------------------
// Конфигурация конкретного сервера (единственное, что отличается между
// тремя копиями этого скрипта)
// ---------------------------------------------------------------------------
const SERVER_LABEL = 'Yandex Tracker';
const BUNDLE_PATH = 'dist/yandex-tracker.bundle.cjs';
const BASE_ENV: Record<string, string> = {
  YANDEX_TRACKER_TOKEN: 'dummy-token-for-raw-wire-test',
  YANDEX_ORG_ID: '123456',
};
const PING_TOOL = 'fr_yandex_tracker_ping';
const DISABLED_CATEGORY = 'issues';
const DISABLED_TOOL = 'fr_yandex_tracker_get_issues';
// ---------------------------------------------------------------------------

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: JsonRpcError;
}

const STARTUP_DELAY_MS = 900;
const RESPONSE_TIMEOUT_MS = 8000;

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'raw-wire-test', version: '1.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}

class ServerHarness {
  private readonly child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private readonly waiters = new Map<number, (msg: JsonRpcResponse) => void>();

  constructor(envOverrides: Record<string, string> = {}) {
    this.child = spawn('node', [BUNDLE_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error', ...BASE_ENV, ...envOverrides },
    });
    this.child.stdout.on('data', (data: Buffer) => this.onData(data));
  }

  private onData(data: Buffer): void {
    this.buffer += data.toString();
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (!line.trim()) continue;

      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(line) as JsonRpcResponse;
      } catch {
        continue; // неполный/не-JSON фрагмент — продолжаем накапливать
      }

      if (typeof msg.id === 'number') {
        const waiter = this.waiters.get(msg.id);
        if (waiter) {
          this.waiters.delete(msg.id);
          waiter(msg);
        }
      }
    }
  }

  private send(payload: Record<string, unknown>): void {
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  async request(
    id: number,
    method: string,
    params?: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    const pending = new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(id);
        reject(new Error(`Таймаут ожидания ответа id=${id} method=${method}`));
      }, RESPONSE_TIMEOUT_MS);

      this.waiters.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });

    this.send({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
    return pending;
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.send({ jsonrpc: '2.0', method, ...(params ? { params } : {}) });
  }

  async close(): Promise<void> {
    if (this.child.killed) return;
    this.child.kill('SIGTERM');
    await sleep(300);
    if (!this.child.killed) {
      this.child.kill('SIGKILL');
    }
  }
}

async function withServer<T>(
  fn: (harness: ServerHarness) => Promise<T>,
  envOverrides?: Record<string, string>
): Promise<T> {
  const harness = new ServerHarness(envOverrides);
  await sleep(STARTUP_DELAY_MS);
  try {
    return await fn(harness);
  } finally {
    await harness.close();
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Убирает волатильные ISO-8601 таймстампы из content перед сравнением между
 * эпохами (сценарий 8): некоторые tool включают текущее время выполнения в
 * payload (например, ping — метку последней попытки подключения), это
 * ожидаемая волатильность самого tool, не протокольное расхождение между
 * legacy и modern.
 */
function normalizeVolatileContent(content: unknown): string {
  return JSON.stringify(content).replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
    '<TIMESTAMP>'
  );
}

let failures = 0;

async function scenario(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`   ✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`   ✗ ${name}`);
    console.error(
      `     ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
    );
  }
}

async function legacyInitialize(harness: ServerHarness, id: number): Promise<JsonRpcResponse> {
  const response = await harness.request(id, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'raw-wire-test', version: '1.0.0' },
  });
  harness.notify('notifications/initialized');
  return response;
}

async function main(): Promise<void> {
  console.log(`🔌 Raw-wire тесты MCP-протокола: ${SERVER_LABEL}\n`);

  await scenario('1. Legacy: initialize → tools/list → tools/call работает как сейчас', () =>
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

  await scenario('2. Modern: server/discover возвращает версии, capabilities и идентичность', () =>
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
    })
  );

  await scenario('3. Modern: запрос без обязательных полей _meta → -32602', () =>
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

  await scenario('4. Неподдерживаемая версия на открывающем сообщении → -32022', () =>
    withServer(async (harness) => {
      const response = await harness.request(1, 'tools/list', {
        _meta: modernMeta({ 'io.modelcontextprotocol/protocolVersion': '9999-01-01' }),
      });
      assert(
        response.error?.code === -32022,
        `ожидался код -32022 (UnsupportedProtocolVersion), получено ${JSON.stringify(response)}`
      );
      assert(
        Array.isArray(response.error?.data?.supported),
        `error.data.supported должен перечислять поддерживаемые версии, получено ${JSON.stringify(response.error?.data)}`
      );
    })
  );

  await scenario('5. Каждый успешный результат содержит resultType и serverInfo в _meta', () =>
    withServer(async (harness) => {
      const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
      const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
      const call = await harness.request(3, 'tools/call', {
        name: PING_TOOL,
        arguments: {},
        _meta: modernMeta(),
      });

      for (const [label, msg] of [
        ['server/discover', discover],
        ['tools/list', list],
        ['tools/call', call],
      ] as const) {
        assert(
          msg.result?.resultType === 'complete',
          `${label}: resultType должен быть 'complete', получено ${JSON.stringify(msg.result?.resultType)}`
        );
        assert(
          msg.result?._meta?.['io.modelcontextprotocol/serverInfo']?.name,
          `${label}: _meta["io.modelcontextprotocol/serverInfo"] должен присутствовать`
        );
      }
    })
  );

  await scenario('6. tools/list содержит ttlMs и cacheScope', () =>
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

  await scenario('7. Два последовательных tools/list дают побайтово одинаковый список', () =>
    withServer(async (harness) => {
      await harness.request(1, 'server/discover', { _meta: modernMeta() });
      const first = await harness.request(2, 'tools/list', { _meta: modernMeta() });
      const second = await harness.request(3, 'tools/list', { _meta: modernMeta() });
      assert(
        JSON.stringify(first.result?.tools) === JSON.stringify(second.result?.tools),
        'два последовательных tools/list вернули разные списки tools'
      );
    })
  );

  await scenario(
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

  await scenario('9. Отказ policy (этап 1) одинаков в обеих эпохах', async () => {
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

  console.log(
    `\n${failures === 0 ? '✅' : '❌'} Raw-wire тесты (${SERVER_LABEL}): ${
      failures === 0 ? 'все 9 сценариев пройдены' : `${failures} сценариев провалено`
    }`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
