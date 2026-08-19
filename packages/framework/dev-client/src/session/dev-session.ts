/**
 * Клиентская сессия: открыть настоящую MCP-сессию (Client + StdioClientTransport
 * из `@modelcontextprotocol/client`), перечислить инструменты, вызвать инструмент,
 * закрыть.
 *
 * Фабрика транспорта инъецируется ({@link OpenSessionOptions.transportFactory}) —
 * без этого ядро, чья суть — процессы и I/O, невозможно протестировать без
 * реального спавна дочернего процесса, а пороги покрытия (80/80/75/80)
 * становятся недостижимы. Это требование пакета (см. README плана,
 * раздел «Тестируемость»), а не деталь реализации.
 */

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import type {
  CallToolResult,
  ClientCapabilities,
  Implementation,
  JSONObject,
  Tool,
  Transport,
} from '@modelcontextprotocol/client';
import { hasPathLikeProperty, type ToolSummary } from '../write-policy/classify.js';
import type { Masker } from '../secrets/masker.js';

/** Готовая к запуску спецификация — выход `launch/` (бандл + composeEnv). */
export interface DevSessionLaunch {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Record<string, string>;
  readonly cwd: string;
}

/**
 * Таймаут MCP-handshake по умолчанию. 15 секунд — заметно больше, чем нужно
 * здоровому серверу (обычно <1с), но достаточно ограничено, чтобы зависший
 * процесс (битый env, сервер ждёт stdin) не вешал вызывающий CLI навсегда.
 */
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 15_000;

/** Верхняя граница буфера накопленного stderr дочернего процесса (символы). */
const STDERR_BUFFER_LIMIT_CHARS = 64 * 1024;

const DEFAULT_CLIENT_INFO: Implementation = {
  name: 'fractalizer-mcp-dev-client',
  version: '1.0.0',
};

/**
 * Клиент не объявляет ни одной capability: dev-интерфейс только читает
 * `tools/list` и делает `tools/call`, roots/sampling/elicitation ему не нужны.
 */
const DEFAULT_CAPABILITIES: ClientCapabilities = {};

/**
 * Ошибка handshake — время истекло раньше ответа сервера на `initialize`.
 * Несёт накопленный (уже замаскированный) stderr процесса для диагностики.
 */
export class HandshakeTimeoutError extends Error {
  constructor(timeoutMs: number, maskedStderr: string) {
    const stderrSuffix =
      maskedStderr.length > 0 ? `\nНакопленный stderr сервера:\n${maskedStderr}` : '';
    super(`MCP handshake не завершился за ${String(timeoutMs)}ms.${stderrSuffix}`);
    this.name = 'HandshakeTimeoutError';
  }
}

/** Опции {@link DevSession.open}. */
export interface OpenSessionOptions {
  readonly launch: DevSessionLaunch;
  /** Маскер для {@link DevSession.getMaskedStderr} — обязателен: сессия не должна уметь отдать сырой stderr. */
  readonly masker: Masker;
  /** DI-точка для тестов. По умолчанию создаёт реальный `StdioClientTransport` по `launch`. */
  readonly transportFactory?: (launch: DevSessionLaunch) => Transport;
  readonly clientInfo?: Implementation;
  readonly capabilities?: ClientCapabilities;
  readonly handshakeTimeoutMs?: number;
}

function defaultTransportFactory(launch: DevSessionLaunch): Transport {
  return new StdioClientTransport({
    command: launch.command,
    args: [...launch.args],
    env: launch.env,
    cwd: launch.cwd,
    // Всегда 'pipe', никогда 'inherit': дефолт SDK ('inherit') ретранслировал бы
    // сырой (немаскированный) stderr дочернего процесса напрямую в наш stderr,
    // в обход контура секретов. Захваченный поток маскируется в getMaskedStderr().
    stderr: 'pipe',
  });
}

function toToolSummary(tool: Tool): ToolSummary {
  const summary: ToolSummary = {
    name: tool.name,
    readOnly: tool.annotations?.readOnlyHint === true,
    destructive: tool.annotations?.destructiveHint === true,
    hasPathArgs: hasPathLikeProperty(tool.inputSchema),
  };
  return tool.title !== undefined ? { ...summary, title: tool.title } : summary;
}

/**
 * Открытая MCP-сессия против локального бандла сервера.
 *
 * Создаётся только через {@link DevSession.open} — конструктор приватный,
 * чтобы нельзя было получить экземпляр без выполненного handshake.
 */
export class DevSession {
  private readonly stderrChunks: string[] = [];
  private stderrLength = 0;
  private closed = false;

  private constructor(
    private readonly client: Client,
    private readonly transport: Transport,
    private readonly masker: Masker
  ) {}

  /** Открыть сессию: создать транспорт, выполнить MCP handshake с таймаутом. */
  static async open(options: OpenSessionOptions): Promise<DevSession> {
    const transportFactory = options.transportFactory ?? defaultTransportFactory;
    const transport = transportFactory(options.launch);
    const client = new Client(options.clientInfo ?? DEFAULT_CLIENT_INFO, {
      capabilities: options.capabilities ?? DEFAULT_CAPABILITIES,
      // Явный, а не унаследованный дефолт SDK: серверы этого монорепо собраны
      // на @modelcontextprotocol/server@2.0.0, который по умолчанию тоже
      // говорит на «legacy»-эпохе протокола. Пиновка здесь — осознанное
      // решение (см. README плана, «clientInfo и capabilities фиксируются
      // явно») — при переходе сервера на 'auto'/pin это место придётся
      // пересмотреть осознанно, а не молча разъехаться по эпохам.
      versionNegotiation: { mode: 'legacy' },
    });

    const session = new DevSession(client, transport, options.masker);
    session.attachStderrCapture();

    const timeoutMs = options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS;
    await session.connectWithTimeout(transport, timeoutMs);
    return session;
  }

  /** Замаскированный накопленный stderr дочернего процесса (может быть пустым). */
  getMaskedStderr(): string {
    return this.masker(this.stderrChunks.join(''));
  }

  /**
   * Перечислить инструменты сервера как {@link ToolSummary} (для классификации
   * политикой записи).
   *
   * Курсорную пагинацию `tools/list` вручную обходить не нужно: вызов
   * `listTools()` **без** `cursor` в `@modelcontextprotocol/client@2.0.0`
   * сам агрегирует страницы (см. `ClientOptions.listMaxPages` и код ошибки
   * `LIST_MAX_PAGES_EXCEEDED` в типах SDK) — ручной цикл дублировал бы
   * механизм SDK и разъехался бы с его лимитом.
   */
  async listTools(): Promise<ToolSummary[]> {
    const result = await this.client.listTools();
    return result.tools.map(toToolSummary);
  }

  /** Вызвать инструмент. Не перехватывает ошибки — вызывающий (`runBatch`) решает, что считать падением сервера. */
  async callTool(name: string, args: JSONObject): Promise<CallToolResult> {
    return this.client.callTool({ name, arguments: args });
  }

  /** Закрыть сессию. Идемпотентно — повторный вызов безопасен (двойное закрытие не должно вешать процесс). */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.client.close();
  }

  private attachStderrCapture(): void {
    const withStderr = this.transport as {
      stderr?: { on?: (event: string, cb: (chunk: Buffer) => void) => void } | null;
    };
    const stream = withStderr.stderr;
    if (!stream || typeof stream.on !== 'function') return;
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      this.stderrChunks.push(text);
      this.stderrLength += text.length;
      while (this.stderrLength > STDERR_BUFFER_LIMIT_CHARS && this.stderrChunks.length > 1) {
        const dropped = this.stderrChunks.shift();
        this.stderrLength -= dropped?.length ?? 0;
      }
    });
  }

  private async connectWithTimeout(transport: Transport, timeoutMs: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new HandshakeTimeoutError(timeoutMs, this.getMaskedStderr()));
      }, timeoutMs);
    });

    try {
      await Promise.race([this.client.connect(transport), timeout]);
    } catch (error) {
      await this.safeCloseTransport(transport);
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async safeCloseTransport(transport: Transport): Promise<void> {
    try {
      await transport.close();
    } catch {
      // Подавляем: процесс уже в состоянии ошибки, вторичный сбой закрытия
      // не должен маскировать первопричину (таймаут/ошибку handshake).
    }
  }
}
