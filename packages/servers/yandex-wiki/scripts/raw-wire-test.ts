#!/usr/bin/env tsx
/**
 * Raw-wire тесты MCP-протокола (пакет 4.1.D плана модернизации MCP 2026-07-28
 * + сценарии сбоев транспорта, добавлены отдельно — по образцу
 * yandex-tracker/scripts/raw-wire-test.ts)
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
 * СЦЕНАРИИ СБОЕВ ТРАНСПОРТА (10-13): единственный способ подсунуть сбой HTTP
 * реальному собранному бандлу, говорящему по stdio отдельным процессом, —
 * поднять локальный HTTP-сервер и направить процесс на него через
 * YANDEX_WIKI_API_BASE (см. src/config/constants.ts, ENV_VAR_NAMES). Retry/error
 * mapping (axios-http-client.ts, retry-handler.ts) — общий framework-код,
 * поведение при сбоях у Wiki принципиально не отличается от Tracker.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as http from 'node:http';
import type { Socket } from 'node:net';

// ---------------------------------------------------------------------------
// Конфигурация конкретного сервера (единственное, что отличается между
// тремя копиями этого скрипта)
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

// В окно теперь входит и старт процесса — фиксированной паузы перед первым
// запросом больше нет (см. withServer): запись в stdin буферизуется ОС-пайпом
// независимо от того, успел ли дочерний процесс стартовать.
const RESPONSE_TIMEOUT_MS = 20000;
// Запас перед SIGKILL при штатном SIGTERM-остановe: событие 'exit' обычно
// приходит почти мгновенно, таймер — лишь страховка на случай, если процесс
// не отреагирует на SIGTERM.
const SHUTDOWN_GRACE_MS = 2000;

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'raw-wire-test', version: '1.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}

interface PendingRequest {
  resolve: (msg: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

class ServerHarness {
  private readonly child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private stderrData = '';
  private readonly waiters = new Map<number, PendingRequest>();

  constructor(envOverrides: Record<string, string> = {}) {
    this.child = spawn('node', [BUNDLE_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error', ...BASE_ENV, ...envOverrides },
    });
    // Один разделяемый декодер на поток: последовательность, разорванная
    // границей чанка, склеивается, а не превращается в U+FFFD.
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: unknown) => this.onData(chunk));
    // stderr читается и копится, чтобы попасть в текст отказа — без этого
    // отказ по 'close'/'error' ниже был бы недиагностируемым ("что-то упало"
    // вместо конкретной ошибки сервера).
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk: unknown) => {
      this.stderrData += assertUtf8Chunk(chunk);
    });

    // Смерть ребёнка между записью в stdin и обработкой ECONNRESET/EPIPE даёт
    // необработанное исключение вместо отказа сценария — 'close'/'error' ниже
    // уже дают настоящую диагностику, здесь только гасим падение процесса.
    this.child.stdin.on('error', () => {});

    this.child.on('close', (code, signal) => {
      this.rejectAllPending(
        `Процесс сервера закрылся (code=${code}, signal=${signal}) до ответа.\n` +
          `stderr: ${this.stderrData}`
      );
    });
    this.child.on('error', (error) => {
      this.rejectAllPending(
        `Ошибка процесса сервера: ${error.message}\nstderr: ${this.stderrData}`
      );
    });
  }

  private rejectAllPending(message: string): void {
    for (const waiter of this.waiters.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(message));
    }
    this.waiters.clear();
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
          clearTimeout(waiter.timer);
          waiter.resolve(msg);
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
        reject(
          new Error(
            `Таймаут (${RESPONSE_TIMEOUT_MS}ms) ожидания ответа id=${id} method=${method}.\n` +
              `stderr: ${this.stderrData}`
          )
        );
      }, RESPONSE_TIMEOUT_MS);

      this.waiters.set(id, { resolve, reject, timer });
    });

    this.send({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
    return pending;
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.send({ jsonrpc: '2.0', method, ...(params ? { params } : {}) });
  }

  /** SIGTERM → событие 'exit' → SIGKILL по истечении SHUTDOWN_GRACE_MS. */
  async close(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        this.child.off('exit', onExit);
        clearTimeout(timer);
        resolve();
      };
      const onExit = (): void => finish();

      this.child.on('exit', onExit);
      this.child.kill('SIGTERM');
      const timer = setTimeout(() => {
        this.child.kill('SIGKILL');
        finish();
      }, SHUTDOWN_GRACE_MS);
    });
  }
}

async function withServer<T>(
  fn: (harness: ServerHarness) => Promise<T>,
  envOverrides?: Record<string, string>
): Promise<T> {
  const harness = new ServerHarness(envOverrides);
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
// Подставной локальный HTTP API (сценарии 10-13): реальный бандл сервера
// нельзя подменить моком (чужой процесс), поэтому вместо реального API
// Яндекс.Вики ему подсовывается локальный http.Server, на который сервер
// направляется через YANDEX_WIKI_API_BASE. Handler получает номер вызова
// (с единицы) — это позволяет сценарию 11 (retry читающего POST) ответить
// по-разному на 1-ю и 2-ю попытку без сложной маршрутизации по путям (в
// каждом сценарии подставной сервер обслуживает ровно один вызываемый tool,
// поэтому различать пути не нужно).
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
   * Останавливает сервер. Форсированно рвёт зависшие сокеты (сценарий 13
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
 * Единственный разрешённый способ превратить чанк потока в строку.
 *
 * Наивный `chunk.toString()` декодирует каждый чанк независимо и рвёт
 * многобайтный UTF-8 на границе чанка: буква превращается в два U+FFFD, длина
 * ответа меняется на символ. Именно это давало «два последовательных
 * tools/list вернули разные списки» в релизном CI (4 падения из 6). Поэтому
 * потоки переводятся в `setEncoding('utf8')` — один разделяемый декодер на
 * поток, корректно склеивающий последовательность через границу чанка, — а
 * эта проверка не даёт молча вернуться к побайтовому декодированию.
 */
function assertUtf8Chunk(chunk: unknown): string {
  if (typeof chunk !== 'string') {
    throw new Error(
      'Поток дочернего процесса не переведён в setEncoding("utf8") — пришёл Buffer. ' +
        'Декодирование чанка по отдельности рвёт многобайтный UTF-8 на границе чанка.'
    );
  }
  return chunk;
}

/**
 * U+FFFD в ответе сервера означает не баг сервера, а испорченное чтение на
 * стороне теста. Проверка стоит на зелёном пути специально: порча,
 * случившаяся одинаково в обоих ответах, расхождения не даёт и иначе прошла
 * бы молча.
 */
function assertNoDecodingDamage(label: string, json: string): void {
  const at = json.indexOf('\uFFFD');
  if (at < 0) {
    return;
  }
  const window = json.slice(Math.max(0, at - MISMATCH_CONTEXT_CHARS), at + MISMATCH_CONTEXT_CHARS);
  throw new Error(
    `${label}: в ответе найден U+FFFD на индексе ${at}. Это ДЕФЕКТ ЧТЕНИЯ на стороне ` +
      'теста, а не сервера: многобайтный UTF-8 порвался на границе чанка. Проверь, что ' +
      `поток переведён в setEncoding("utf8") и чанки не декодируются поштучно.\n  ${JSON.stringify(window)}`
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
 * Отчёт о расхождении двух ответов `tools/list`; `undefined`, когда списки
 * побайтово совпадают.
 *
 * Единственный источник данных о четырёх падениях релиза — лог GitHub Actions,
 * поэтому отчёт должен быть самодостаточным: по нему решают, что именно
 * разошлось, без повторного прогона (который локально не воспроизводится).
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
      'ВЕРДИКТ: в ответе есть U+FFFD — это дефект ЧТЕНИЯ на стороне теста ' +
        '(многобайтный UTF-8 порван на границе чанка), а не расхождение на стороне сервера.'
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

  await scenario(
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

  await scenario(
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

  await scenario(
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
