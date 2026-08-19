#!/usr/bin/env tsx
/**
 * Raw-wire тесты MCP-протокола (пакет 4.1.D плана модернизации MCP 2026-07-28
 * + сценарии сбоев транспорта, добавлены отдельно)
 *
 * Говорит с РЕАЛЬНЫМ собранным бандлом байтами JSON-RPC по stdio (как
 * scripts/smoke-test-server.ts), а не через внутренние API. Девять базовых
 * сценариев из плана — по одному набору на каждый из трёх серверов.
 * Не покрывает поведение, реализованное внутри самого SDK, кроме как
 * через наблюдаемый эффект на wire (это и есть цель этих тестов).
 *
 * ВАЖНО про сценарий 4: era и версия протокола валидируются SDK один раз
 * при открытии соединения (первое сообщение), а не на каждый запрос —
 * "no per-request era consult" (см. create-mcp-server-adapter.ts). Поэтому
 * неподдерживаемую версию нужно слать именно ПЕРВЫМ сообщением НОВОГО
 * соединения — на уже открытом modern-соединении она будет проигнорирована.
 *
 * СЦЕНАРИИ СБОЕВ ТРАНСПОРТА (10-12): единственный способ подсунуть сбой HTTP
 * реальному собранному бандлу, говорящему по stdio отдельным процессом, —
 * поднять локальный HTTP-сервер и направить процесс на него через
 * TICKTICK_API_BASE_URL (см. src/config/constants.ts, ENV_VAR_NAMES).
 *
 * ЧЕГО ЗДЕСЬ НЕТ: сценария "читающий POST повторяется". В коде TickTick НЕТ
 * ни одного POST, объявленного `idempotencyDeclared: true` (проверено:
 * ни одного вызова `.post(..., true)` в src/ticktick_api/api_operations —
 * search-tasks реализован как client-side фильтр над GET `getAllTasks()`,
 * настоящего idempotent-POST-эндпоинта в этом API нет). В отличие от
 * yandex-tracker (`_search`, `create_issue` с ключом `unique`), здесь нечего
 * тестировать — сценарий не про непроверяемость на проводе, а про отсутствие
 * самого кода.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import * as http from 'node:http';
import type { Socket } from 'node:net';

// ---------------------------------------------------------------------------
// Конфигурация конкретного сервера (единственное, что отличается между
// тремя копиями этого скрипта)
// ---------------------------------------------------------------------------
const SERVER_LABEL = 'TickTick';
const BUNDLE_PATH = 'dist/ticktick.bundle.cjs';
const BASE_ENV: Record<string, string> = {
  TICKTICK_ACCESS_TOKEN: 'dummy-token-for-raw-wire-test',
};
const PING_TOOL = 'fr_ticktick_ping';
const DISABLED_CATEGORY = 'tasks';
const DISABLED_TOOL = 'fr_ticktick_delete_task';
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
    // One shared decoder per stream: a sequence split by a chunk boundary is
    // stitched back together instead of becoming U+FFFD.
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: unknown) => this.onData(chunk));
  }

  private onData(chunk: unknown): void {
    this.buffer += assertUtf8Chunk(chunk);
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

// ---------------------------------------------------------------------------
// Подставной локальный HTTP API (сценарии 10-12): реальный бандл сервера
// нельзя подменить моком (чужой процесс), поэтому вместо реального API
// TickTick ему подсовывается локальный http.Server, на который сервер
// направляется через TICKTICK_API_BASE_URL. Handler получает номер вызова
// (с единицы) — в каждом сценарии подставной сервер обслуживает ровно один
// вызываемый tool, поэтому различать пути не нужно.
// ---------------------------------------------------------------------------
interface FakeApiRequest {
  method: string;
  path: string;
  bodyRaw: string;
}

class FakeApiServer {
  private readonly server: http.Server;
  private readonly sockets = new Set<Socket>();
  readonly requests: FakeApiRequest[] = [];

  constructor(
    private readonly handler: (
      request: FakeApiRequest,
      res: http.ServerResponse,
      callIndex: number
    ) => void
  ) {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const request: FakeApiRequest = {
          method: req.method ?? '',
          path: (req.url ?? '').split('?')[0] ?? '',
          bodyRaw: Buffer.concat(chunks).toString('utf8'),
        };
        this.requests.push(request);
        this.handler(request, res, this.requests.length);
      });
    });
    this.server.on('connection', (socket: Socket) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
    });
  }

  /** Запускает сервер на свободном порту, возвращает его базовый URL. */
  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    const address = this.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('FakeApiServer: не удалось определить порт (server.address())');
    }
    return `http://127.0.0.1:${address.port}`;
  }

  /**
   * Останавливает сервер. Форсированно рвёт зависшие сокеты (сценарий 12
   * "таймаут" держит соединение открытым бесконечно — обычно к этому моменту
   * клиент (axios) уже сам оборвал его по таймауту, но не полагаемся на это).
   */
  async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** Отправляет JSON-ответ с корректным Content-Type/Content-Length. */
function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Достаёт `supported` из `error.data` (тип `unknown` — форма зависит от кода
 * ошибки, у -32022 это список версий, у остальных кодов поле может
 * отсутствовать вовсе).
 */
function extractSupportedVersions(data: unknown): unknown {
  if (data && typeof data === 'object' && 'supported' in data) {
    return (data as { supported: unknown }).supported;
  }
  return undefined;
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
let scenarioCount = 0;

async function scenario(name: string, fn: () => Promise<void>): Promise<void> {
  scenarioCount += 1;
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

const MISMATCH_CONTEXT_CHARS = 120;

/**
 * The only allowed way to turn a stream chunk into a string.
 *
 * A naive `chunk.toString()` decodes every chunk on its own and tears
 * multi-byte UTF-8 apart on the chunk boundary: one letter becomes two U+FFFD
 * and the response length shifts by a character. That is what produced "two
 * consecutive tools/list calls returned different lists" in the release CI
 * (4 of 6 failures). Streams are therefore switched to `setEncoding('utf8')` —
 * a single shared decoder per stream that stitches a sequence across the chunk
 * boundary — and this check keeps anyone from silently going back to per-chunk
 * decoding.
 */
function assertUtf8Chunk(chunk: unknown): string {
  if (typeof chunk !== 'string') {
    throw new Error(
      'Child process stream is not in setEncoding("utf8") mode — got a Buffer. ' +
        'Decoding chunks individually tears multi-byte UTF-8 on the chunk boundary.'
    );
  }
  return chunk;
}

/**
 * A U+FFFD in the server response means a broken read on the test side, not a
 * server bug. The check sits on the green path on purpose: damage that hits
 * both responses identically produces no mismatch and would otherwise pass
 * unnoticed.
 */
function assertNoDecodingDamage(label: string, json: string): void {
  const at = json.indexOf('\uFFFD');
  if (at < 0) {
    return;
  }
  const window = json.slice(Math.max(0, at - MISMATCH_CONTEXT_CHARS), at + MISMATCH_CONTEXT_CHARS);
  throw new Error(
    `${label}: found U+FFFD at index ${at}. This is a test-side READ DEFECT, not a server ` +
      'bug: multi-byte UTF-8 was torn on a chunk boundary. Check that the stream uses ' +
      `setEncoding("utf8") and that chunks are not decoded one by one.\n  ${JSON.stringify(window)}`
  );
}

function toolNamesForDiagnostics(tools: unknown): string[] {
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.map((tool, index) => {
    const name = (tool as { name?: unknown } | null)?.name;
    return typeof name === 'string' ? name : `<no-name@${index}>`;
  });
}

function duplicatedNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  }
  return [...duplicates];
}

/**
 * Report describing how two `tools/list` responses differ; `undefined` when the
 * lists are byte-identical.
 *
 * The only data about the four release failures is the GitHub Actions log, so
 * the report must be self-contained: it has to show what exactly diverged
 * without a re-run (the mismatch does not reproduce locally).
 */
function describeToolsListMismatch(first: unknown, second: unknown): string | undefined {
  const firstJson = JSON.stringify(first ?? []);
  const secondJson = JSON.stringify(second ?? []);
  if (firstJson === secondJson) {
    return undefined;
  }

  const lines: string[] = ['===== tools/list mismatch diagnostics ====='];
  lines.push(`json length: first=${firstJson.length}, second=${secondJson.length} (UTF-16 units)`);

  let diffAt = 0;
  while (
    diffAt < firstJson.length &&
    diffAt < secondJson.length &&
    firstJson[diffAt] === secondJson[diffAt]
  ) {
    diffAt += 1;
  }
  const from = Math.max(0, diffAt - MISMATCH_CONTEXT_CHARS);
  const to = diffAt + MISMATCH_CONTEXT_CHARS;
  lines.push(`first difference at index ${diffAt}; window [${from}, ${to}):`);
  lines.push(`  first : ${JSON.stringify(firstJson.slice(from, to))}`);
  lines.push(`  second: ${JSON.stringify(secondJson.slice(from, to))}`);

  const firstNames = toolNamesForDiagnostics(first);
  const secondNames = toolNamesForDiagnostics(second);
  lines.push(`tool count: first=${firstNames.length}, second=${secondNames.length}`);
  if (firstJson.includes('\uFFFD') || secondJson.includes('\uFFFD')) {
    lines.push(
      'VERDICT: the response contains U+FFFD — this is a test-side READ defect ' +
        '(multi-byte UTF-8 torn on a chunk boundary), not a server-side divergence.'
    );
  }

  const firstSet = new Set(firstNames);
  const secondSet = new Set(secondNames);
  const onlyInFirst = [...firstSet].filter((name) => !secondSet.has(name));
  const onlyInSecond = [...secondSet].filter((name) => !firstSet.has(name));
  lines.push(`only in first (${onlyInFirst.length}): ${onlyInFirst.join(', ') || '-'}`);
  lines.push(`only in second (${onlyInSecond.length}): ${onlyInSecond.join(', ') || '-'}`);

  const firstDuplicates = duplicatedNames(firstNames);
  const secondDuplicates = duplicatedNames(secondNames);
  if (firstDuplicates.length > 0 || secondDuplicates.length > 0) {
    lines.push(
      `duplicate names: first=[${firstDuplicates.join(', ')}], second=[${secondDuplicates.join(', ')}]`
    );
  }

  if (onlyInFirst.length === 0 && onlyInSecond.length === 0) {
    const reordered = firstNames
      .map((name, index) =>
        secondNames[index] === name
          ? undefined
          : `#${index}: ${name} -> ${secondNames[index] ?? '<missing>'}`
      )
      .filter((entry): entry is string => entry !== undefined);
    lines.push(
      reordered.length === 0
        ? 'name order: identical (names and order match, so the difference is inside tool definitions - see the window above)'
        : `name order differs at ${reordered.length} position(s), first 20: ${reordered.slice(0, 20).join('; ')}`
    );
  }

  return lines.join('\n');
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
            icon.mimeType === 'image/svg+xml' && icon.src?.startsWith('data:image/svg+xml;base64,')
        ),
        `icons должен содержать SVG как data: URI, получено ${JSON.stringify(icons)}`
      );

      // M1 (REVIEW_MCP_SDK_FINDINGS.md): механизм иконок опирается на патч
      // приватного метода SDK (_ondiscover) — если он тихо перестанет
      // работать, единственный сигнал регрессии — этот негативный ассерт.
      // Держим его именно в сценарии 2 (не только в сценарии 5), рядом с
      // позитивной проверкой icons на discover, чтобы обе половины контракта
      // ("иконка есть на discover" / "иконки нет на обычном ответе") были
      // видны в одном месте и одной сессии соединения.
      const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
      const listServerInfo = list.result?._meta?.['io.modelcontextprotocol/serverInfo'];
      assert(
        listServerInfo?.icons === undefined,
        `tools/list: _meta["io.modelcontextprotocol/serverInfo"].icons НЕ должен присутствовать ` +
          `на обычном ответе (иконка едет только в server/discover), получено ${JSON.stringify(listServerInfo?.icons)}`
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
        Array.isArray(extractSupportedVersions(response.error?.data)),
        `error.data.supported должен перечислять поддерживаемые версии, получено ${JSON.stringify(response.error?.data)}`
      );
    })
  );

  await scenario(
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
      assertNoDecodingDamage('tools/list', JSON.stringify(first.result?.tools));
      const mismatch = describeToolsListMismatch(first.result?.tools, second.result?.tools);
      if (mismatch !== undefined) {
        console.log(mismatch);
        throw new Error(`два последовательных tools/list вернули разные списки tools\n${mismatch}`);
      }
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

  await scenario(
    '10. Мутирующий POST (create_task) не повторяется при 503 (неопределённый исход), ошибка несёт подсказку про возможное выполнение',
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
              name: 'fr_ticktick_create_task',
              arguments: { title: 'raw-wire test task' },
            });
          },
          { TICKTICK_API_BASE_URL: apiBase }
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

  await scenario(
    '11. Ошибка API доходит до клиента как isError:true с message/statusCode/errorsData',
    async () => {
      const fakeErrorsData = { field: 'title', reason: 'duplicate task detected' };
      const fake = new FakeApiServer((_request, res) => {
        sendJson(res, 400, { message: 'Invalid task payload', errorsData: fakeErrorsData });
      });
      const apiBase = await fake.start();
      try {
        const call = await withServer(
          async (harness) => {
            await legacyInitialize(harness, 1);
            return harness.request(2, 'tools/call', {
              name: 'fr_ticktick_create_task',
              arguments: { title: 'raw-wire test task' },
            });
          },
          { TICKTICK_API_BASE_URL: apiBase }
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
            payload.error.message.includes('Invalid task payload'),
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

  await scenario(
    '12. Таймаут: API не отвечает — клиент получает понятную сетевую ошибку',
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
              name: 'fr_ticktick_raw_api_request',
              arguments: { method: 'GET', path: '/project', fields: ['id'] },
            });
          },
          {
            TICKTICK_API_BASE_URL: apiBase,
            REQUEST_TIMEOUT: '5000',
            TICKTICK_RETRY_ATTEMPTS: '0',
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

  console.log(
    `\n${failures === 0 ? '✅' : '❌'} Raw-wire тесты (${SERVER_LABEL}): ${
      failures === 0
        ? `все ${scenarioCount} сценариев пройдены`
        : `${failures} из ${scenarioCount} сценариев провалено`
    }`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
