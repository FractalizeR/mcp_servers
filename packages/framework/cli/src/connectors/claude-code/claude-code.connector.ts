/**
 * Коннектор для Claude Code CLI.
 *
 * Использует команды `claude mcp add/remove/list/get` вместо записи в файл.
 *
 * Discovery (на момент написания, Claude Code CLI 2.x):
 *   - `claude mcp list` НЕ поддерживает `--json` (только `-h/--help`).
 *     Вывод парсится как текст по строкам формата:
 *       `<server-name>: <command-summary> - <status-icon> <status-text>`
 *     где status-icon — один из `✓ Connected`, `✗ Failed to connect`,
 *     `! Needs authentication`. Имя сервера может содержать пробелы.
 *   - `claude mcp get <name>` даёт структурированный многострочный вывод:
 *       ```
 *       <name>:
 *         Scope: ...
 *         Status: ...
 *         Type: stdio
 *         Command: node
 *         Args: /abs/script.cjs [...]
 *         Environment:
 *           KEY1=value1
 *           KEY2=value2
 *       ```
 *     Каждая переменная окружения — отдельная строка с отступом.
 *   - `claude mcp add` НЕ поддерживает флаги `--cwd` или `--disabled`.
 *     При наличии в spec этих полей мы пишем предупреждение в Logger и
 *     игнорируем их (соответствующие поля недоступны в claude-code).
 *
 * Ограничения парсинга:
 *   - Args парсится по whitespace. Если путь в args содержит пробелы,
 *     парсер их некорректно разобьёт. Это ограничение `claude mcp get`,
 *     который выводит args одной сырой строкой без кавычек.
 */

import { BaseConnector } from '../base/base-connector.js';
import { CommandExecutor } from '../../utils/command-executor.js';
import { Logger } from '../../utils/logger.js';
import type { ConnectionStatus, MCPClientInfo } from '../../types/client.types.js';
import type { ServerLaunchSpec } from '../../types/launch.types.js';

/**
 * Type guard для проверки Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Таймаут для `claude mcp list` (мс).
 *
 * `list` запускает stdio-серверы для health-check и при проблемах с
 * authentication-токеном/демоном клиента может зависнуть. Без таймаута CLI
 * застывает намертво.
 */
const CLAUDE_MCP_LIST_TIMEOUT_MS = 5000;

/**
 * Коннектор для Claude Code CLI.
 */
export class ClaudeCodeConnector extends BaseConnector {
  private readonly serverName: string;

  /**
   * @param serverName - Имя MCP сервера для управления через `claude mcp`
   */
  constructor(serverName: string) {
    super();
    this.serverName = serverName;
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-code',
      displayName: 'Claude Code',
      description: 'CLI инструмент Claude Code для разработки',
      checkCommand: 'claude --version',
      configPath: 'managed-by-cli',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  isInstalled(): Promise<boolean> {
    return Promise.resolve(CommandExecutor.isCommandAvailable('claude'));
  }

  /**
   * Получить статус подключения через парсинг `claude mcp list`.
   *
   * Состояния:
   *  - `✓ Connected` → connected: true
   *  - `✗ Failed to connect` → connected: false, error: 'Failed to connect'
   *  - `! Needs authentication` → connected: false, error: 'Needs authentication'
   *  - неизвестное → connected: false, error: `Unknown state: <raw>` (для диагностики)
   *  - сервер отсутствует в выводе → connected: false
   *  - таймаут → connected: false, error: 'Timeout: ...'
   */
  getStatus(): Promise<ConnectionStatus> {
    let output: string;
    try {
      output = CommandExecutor.execFile('claude', ['mcp', 'list'], {
        timeout: CLAUDE_MCP_LIST_TIMEOUT_MS,
      });
    } catch (error) {
      return Promise.resolve({
        connected: false,
        error: `Ошибка проверки статуса: ${isError(error) ? error.message : String(error)}`,
      });
    }

    return Promise.resolve(this.parseStatusFromList(output));
  }

  /**
   * Подключить MCP сервер через `claude mcp add`.
   *
   * Формирует команду вида:
   *   claude mcp add --transport stdio <name> [--env K=V ...] -- <command> [<args>...]
   *
   * Поля {@link ServerLaunchSpec.cwd} и {@link ServerLaunchSpec.disabled}
   * НЕ поддерживаются claude-code CLI — при их наличии пишется warning и они
   * игнорируются.
   */
  async connect(spec: ServerLaunchSpec): Promise<void> {
    if (spec.cwd !== undefined) {
      Logger.warn(
        `claude-code не поддерживает 'cwd' в конфигурации MCP сервера; поле проигнорировано (значение: ${spec.cwd}).`
      );
    }
    if (spec.disabled === true) {
      Logger.warn(
        "claude-code не поддерживает 'disabled' для MCP сервера; будет добавлен как активный."
      );
    }

    const args: string[] = ['mcp', 'add', '--transport', 'stdio', this.serverName];

    for (const [key, value] of Object.entries(spec.env)) {
      args.push('--env', `${key}=${value}`);
    }

    args.push('--', spec.command, ...spec.args);

    await CommandExecutor.execInteractive('claude', args);
  }

  async disconnect(): Promise<void> {
    await CommandExecutor.execInteractive('claude', ['mcp', 'remove', this.serverName]);
  }

  /**
   * Получить spec через `claude mcp get <name>`.
   *
   * Парсит структурированный вывод (multi-line):
   *   Type: stdio
   *   Command: node
   *   Args: /abs/path.cjs
   *   Environment:
   *     KEY=value
   *     OTHER=...
   *
   * @returns spec, если сервер есть и stdio; `null` если не найден, http/sse или
   *          парсинг не удался.
   */
  getLaunchSpec(): Promise<ServerLaunchSpec | null> {
    let output: string;
    try {
      output = CommandExecutor.execFile('claude', ['mcp', 'get', this.serverName], {
        timeout: CLAUDE_MCP_LIST_TIMEOUT_MS,
      });
    } catch {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.parseLaunchSpecFromGet(output));
  }

  // ----- internal -----

  /**
   * Парсинг строк `claude mcp list`. Формат строки:
   *   `<name>: <command-tail> - <status>`
   * где `<name>` может содержать пробелы (например, `claude.ai Gmail`).
   *
   * Чтобы корректно распознать строку именно нашего сервера, проверяем префикс
   * `<serverName>: ` (с обязательным пробелом после двоеточия — иначе
   * `tracker: ...` поймает `tracker-dev: ...`).
   */
  private parseStatusFromList(output: string): ConnectionStatus {
    const prefix = `${this.serverName}: `;
    const line = output
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith(prefix));

    if (!line) {
      return { connected: false };
    }

    const tail = line.slice(prefix.length).trim();
    // последний разделитель ' - ' отделяет статус
    const sepIdx = tail.lastIndexOf(' - ');
    const statusPart = sepIdx >= 0 ? tail.slice(sepIdx + 3).trim() : tail;

    if (statusPart.startsWith('✓')) {
      return {
        connected: true,
        details: { configPath: 'managed by claude mcp' },
      };
    }
    if (statusPart.startsWith('✗')) {
      // распространённый вариант: `✗ Failed to connect`
      return { connected: false, error: statusPart.replace(/^✗\s*/, '') };
    }
    if (statusPart.startsWith('!')) {
      return { connected: false, error: statusPart.replace(/^!\s*/, '') };
    }
    // Неизвестное состояние: считаем НЕ подключённым (consume-defensive),
    // чтобы при изменении формата claude CLI не давать false positive.
    return {
      connected: false,
      error: `Unknown state: ${statusPart}`,
      details: { configPath: 'managed by claude mcp' },
    };
  }

  /**
   * Парсинг вывода `claude mcp get <name>`. Возвращает `null`, если сервер не
   * stdio или критичные поля не распознаны.
   *
   * Особенности формата:
   *  - `Environment:` сам по себе обычно без значения, далее следуют строки
   *    с отступом вида `  KEY=value` (по одной паре на строку).
   *  - `Args:` — одна строка, разделители — пробелы. Пути с пробелами в
   *    результате парсятся некорректно (ограничение `claude mcp get`).
   */
  private parseLaunchSpecFromGet(output: string): ServerLaunchSpec | null {
    const rawLines = output.split('\n');
    const trimmedLines = rawLines.map((l) => l.trim());
    const findValue = (label: string): string | undefined => {
      const prefix = `${label}:`;
      const line = trimmedLines.find((l) => l.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : undefined;
    };

    const type = findValue('Type');
    if (type && type.toLowerCase() !== 'stdio') {
      return null;
    }

    const command = findValue('Command');
    if (!command) {
      return null;
    }

    const argsLine = findValue('Args') ?? '';
    const args = argsLine.length > 0 ? argsLine.split(/\s+/).filter((a) => a.length > 0) : [];

    const env = this.parseEnvSection(rawLines);

    return { command, args, env };
  }

  /**
   * Парсинг секции `Environment:` из вывода `claude mcp get`.
   *
   * Поддерживает 2 формата:
   *  1. Многострочный (CLI 2.x): `Environment:` + последующие строки с отступом
   *     вида `  KEY=value` (одна пара на строку, продолжается пока есть отступ).
   *  2. Однострочный (legacy/fallback): `Environment: KEY=v1, OTHER=v2`.
   *     Разделители — `,` между парами; разделитель ключ/значение — `=`.
   *     Этот формат не выдерживает запятых в values; ограничение задокументировано.
   */
  private parseEnvSection(rawLines: string[]): Record<string, string> {
    const env: Record<string, string> = {};

    // Найти индекс строки `Environment:`
    const envHeaderIdx = rawLines.findIndex((l) => l.trim().startsWith('Environment:'));
    if (envHeaderIdx === -1) return env;

    const envHeaderLine = rawLines[envHeaderIdx] ?? '';
    const inline = envHeaderLine.slice(envHeaderLine.indexOf(':') + 1).trim();

    if (inline.length > 0) {
      // Однострочный формат (legacy): "Environment: K1=v1, K2=v2"
      for (const pair of inline.split(',').map((s) => s.trim())) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          env[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
        }
      }
      return env;
    }

    // Многострочный формат: KEY=VALUE на каждой следующей строке с отступом.
    // Останавливаемся при первой строке без отступа (пустая или новая секция).
    for (let i = envHeaderIdx + 1; i < rawLines.length; i++) {
      const raw = rawLines[i] ?? '';
      const trimmed = raw.trim();
      if (trimmed.length === 0) break;
      // Если строка без отступа — это новая секция (например, "To remove this server...")
      const hasIndent = raw.startsWith(' ') || raw.startsWith('\t');
      if (!hasIndent) break;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }

    return env;
  }
}
