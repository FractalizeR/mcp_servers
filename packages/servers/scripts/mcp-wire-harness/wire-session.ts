/**
 * Транспортный низ raw-wire тестов: спавн собранного бандла, буферизация
 * stdout, сопоставление ответа с запросом по id, таймауты, останов.
 *
 * СЦЕНАРИИ СЮДА НЕ ПЕРЕЕЗЖАЮТ и НЕ переводятся на официальный `Client`.
 * Raw-wire тесты специально говорят сырыми байтами JSON-RPC, потому что
 * проверяют поведение самого SDK (negotiation эпох, коды ошибок, реакцию на
 * неполный `_meta`). Прогон их через клиент того же SDK превратил бы проверку
 * в тавтологию. Общим выносится только то, что ниже уровня протокола.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { assertUtf8Chunk, collectUtf8 } from './utf8-stream.js';
import { stopGracefully, waitForStderrSubstring, SHUTDOWN_GRACE_MS } from './process-lifecycle.js';

export interface JsonRpcError {
  code: number;
  message: string;
  /**
   * Свободная форма по спецификации JSON-RPC: состав полей задаёт сервер.
   * Индексируемый тип, а не `unknown`, — сценарии обращаются к конкретным
   * ключам (например `supported` у -32022), и `unknown` заставлял бы каждый
   * такой доступ приводить типы вручную.
   */
  data?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: JsonRpcError;
}

/** Отличия между тремя серверами — единственное, что задаётся снаружи. */
export interface WireServerConfig {
  /** Человекочитаемое имя сервера для заголовков отчёта. */
  readonly label: string;
  /** Путь к собранному бандлу относительно каталога пакета сервера. */
  readonly bundlePath: string;
  /** Переменные окружения, без которых сервер не стартует (токен, org id). */
  readonly baseEnv: Record<string, string>;
}

/**
 * В окно ответа входит и старт процесса — фиксированной паузы перед первым
 * запросом нет: запись в stdin буферизуется ОС-пайпом независимо от того,
 * успел ли дочерний процесс стартовать. Готовностью считается сам ответ.
 */
export const RESPONSE_TIMEOUT_MS = 20000;

interface PendingRequest {
  resolve: (msg: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class ServerHarness {
  private readonly child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private readonly readStderr: () => string;
  private readonly waiters = new Map<number, PendingRequest>();

  constructor(config: WireServerConfig, envOverrides: Record<string, string> = {}) {
    this.child = spawn('node', [config.bundlePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error', ...config.baseEnv, ...envOverrides },
    });
    // Один разделяемый декодер на поток: последовательность, разорванная
    // границей чанка, склеивается, а не превращается в U+FFFD.
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: unknown) => this.onData(chunk));
    // stderr читается и копится, чтобы попасть в текст отказа — без этого
    // отказ по 'close'/'error' ниже был бы недиагностируемым.
    this.readStderr = collectUtf8(this.child.stderr);

    // Смерть ребёнка между записью в stdin и обработкой ECONNRESET/EPIPE даёт
    // необработанное исключение вместо отказа сценария — 'close'/'error' ниже
    // уже дают настоящую диагностику, здесь только гасим падение процесса.
    this.child.stdin.on('error', () => {});

    this.child.on('close', (code, signal) => {
      this.rejectAllPending(
        `Процесс сервера закрылся (code=${code}, signal=${signal}) до ответа.\n` +
          `stderr: ${this.readStderr()}`
      );
    });
    this.child.on('error', (error) => {
      this.rejectAllPending(
        `Ошибка процесса сервера: ${error.message}\nstderr: ${this.readStderr()}`
      );
    });
  }

  /** Накопленный stderr дочернего процесса (для диагностики сценариев). */
  stderr(): string {
    return this.readStderr();
  }

  /**
   * Событийное ожидание подстроки в stderr сервера: резолвится по приходу
   * данных, а не по истечении паузы. Нужно проверкам, чей предмет — поведение
   * процесса на старте (например, предупреждение об устаревшей переменной
   * окружения), а не протокол.
   */
  async waitForStderr(pattern: string, timeoutMs: number): Promise<void> {
    return waitForStderrSubstring(this.child, pattern, this.readStderr, timeoutMs);
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
              `stderr: ${this.readStderr()}`
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
    await stopGracefully(this.child, SHUTDOWN_GRACE_MS);
  }
}

/**
 * Строит `withServer` для конкретного сервера: сценарии получают готовый
 * харнесс и не знают ни про бандл, ни про env.
 */
export function createWithServer(
  config: WireServerConfig
): <T>(
  fn: (harness: ServerHarness) => Promise<T>,
  envOverrides?: Record<string, string>
) => Promise<T> {
  return async function withServer<T>(
    fn: (harness: ServerHarness) => Promise<T>,
    envOverrides?: Record<string, string>
  ): Promise<T> {
    const harness = new ServerHarness(config, envOverrides);
    try {
      return await fn(harness);
    } finally {
      await harness.close();
    }
  };
}

/**
 * Открытие legacy-соединения: `initialize` + `notifications/initialized`.
 * Возвращает ответ на `initialize` — сценарии проверяют его содержимое.
 */
export async function legacyInitialize(
  harness: ServerHarness,
  id: number
): Promise<JsonRpcResponse> {
  const response = await harness.request(id, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'raw-wire-test', version: '1.0.0' },
  });
  harness.notify('notifications/initialized');
  return response;
}

/** Стандартный `_meta` открывающего сообщения modern-эпохи. */
export function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'raw-wire-test', version: '1.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}
