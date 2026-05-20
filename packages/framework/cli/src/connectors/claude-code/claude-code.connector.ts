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
 *   - `claude mcp get <name>` даёт структурированный вывод
 *     (`Command:`, `Args:`, `Environment:`) — используется для {@link getLaunchSpec}.
 */

import { BaseConnector } from '../base/base-connector.js';
import { CommandExecutor } from '../../utils/command-executor.js';
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
   *  - неизвестное → connected: true, error: `Unknown state: <raw>` (для диагностики)
   *  - сервер отсутствует в выводе → connected: false
   *  - таймаут → connected: false, error: 'Timeout: ...'
   */
  getStatus(): Promise<ConnectionStatus> {
    let output: string;
    try {
      output = CommandExecutor.exec('claude mcp list', { timeout: CLAUDE_MCP_LIST_TIMEOUT_MS });
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
   */
  async connect(spec: ServerLaunchSpec): Promise<void> {
    const args = ['mcp', 'add', '--transport', 'stdio', this.serverName];

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
   * Парсит структурированный вывод:
   *   Type: stdio
   *   Command: node
   *   Args: /abs/path.cjs
   *   Environment: KEY=value, OTHER=...
   *
   * @returns spec, если сервер есть и stdio; `null` если не найден, http/sse или
   *          парсинг не удался.
   */
  getLaunchSpec(): Promise<ServerLaunchSpec | null> {
    let output: string;
    try {
      output = CommandExecutor.exec(`claude mcp get ${shellEscape(this.serverName)}`, {
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
   * `<serverName>: `.
   */
  private parseStatusFromList(output: string): ConnectionStatus {
    const prefix = `${this.serverName}:`;
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
    return {
      connected: true,
      error: `Unknown state: ${statusPart}`,
      details: { configPath: 'managed by claude mcp' },
    };
  }

  /**
   * Парсинг вывода `claude mcp get <name>`. Возвращает `null`, если сервер не
   * stdio или критичные поля не распознаны.
   */
  private parseLaunchSpecFromGet(output: string): ServerLaunchSpec | null {
    const lines = output.split('\n').map((l) => l.trim());
    const fieldOf = (label: string): string | undefined => {
      const prefix = `${label}:`;
      const line = lines.find((l) => l.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : undefined;
    };

    const type = fieldOf('Type');
    if (type && type.toLowerCase() !== 'stdio') {
      return null;
    }

    const command = fieldOf('Command');
    if (!command) {
      return null;
    }

    const argsLine = fieldOf('Args') ?? '';
    const args = argsLine.length > 0 ? argsLine.split(/\s+/).filter((a) => a.length > 0) : [];

    const envLine = fieldOf('Environment') ?? '';
    const env: Record<string, string> = {};
    if (envLine.length > 0) {
      for (const pair of envLine.split(',').map((s) => s.trim())) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          env[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
        }
      }
    }

    return { command, args, env };
  }
}

/**
 * Простое экранирование для безопасной подстановки имени сервера в shell-команду.
 * Только разрешённые символы (буквы/цифры/`_-.`) пропускаются без кавычек;
 * всё остальное — заворачивается в одинарные кавычки с эскейпом одинарных кавычек.
 */
function shellEscape(s: string): string {
  if (/^[A-Za-z0-9_.\-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
