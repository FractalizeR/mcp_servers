/**
 * Коннектор для Claude Code CLI.
 *
 * Использует команды `claude mcp add/remove/list/get` вместо записи в файл.
 *
 * Управление scope (`local` / `user` / `project`):
 *   - claude mcp использует разные хранилища для разных scope: local —
 *     `~/.claude.json` → `projects["<cwd>"].mcpServers` (приватно к проекту),
 *     user — корень `~/.claude.json` (доступен везде), project — `.mcp.json`
 *     в корне проекта (видим команде через git).
 *   - `claude mcp add` без `--scope` дефолтит в `local` и НЕ блокирует, если
 *     запись уже есть в другом scope (молча создаёт дубликат).
 *   - `claude mcp remove` без `--scope` сам ищет запись, но падает с
 *     "exists in multiple scopes", если запись в нескольких.
 *
 * Поведение этого коннектора (фикс баг-а с дубликатами):
 *   - connect → принудительно `--scope user` (стабильный default; доступен
 *     из любой директории). Если запись уже существует (в любом scope) —
 *     `connect` бросает осмысленную ошибку с подсказкой про `disconnect`.
 *   - disconnect → итеративно `claude mcp get` + `claude mcp remove -s <scope>`
 *     пока запись существует (умеет вычищать дубликаты, появившиеся ранее).
 *   - getStatus → читает scope из `claude mcp get` и кладёт его в `details.scope`.
 *
 * Discovery (на момент написания, Claude Code CLI 2.x):
 *   - `claude mcp list` НЕ поддерживает `--json` (только `-h/--help`).
 *     Вывод парсится как текст по строкам формата:
 *       `<server-name>: <command-summary> - <status-icon> <status-text>`
 *     где status-icon — один из `✔`/`✓ Connected`, `✗ Failed to connect`,
 *     `! Needs authentication`. Имя сервера может содержать пробелы.
 *   - `claude mcp get <name>` даёт структурированный многострочный вывод:
 *       ```
 *       <name>:
 *         Scope: Local config (private to you in this project)
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
import type { GetLaunchSpecResult, ServerLaunchSpec } from '../../types/launch.types.js';

/**
 * Type guard для проверки Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Возможные scope записи в `claude mcp`.
 */
export type ClaudeCodeScope = 'user' | 'project' | 'local';

/**
 * Таймаут для `claude mcp list` / `get` (мс).
 *
 * `list` запускает stdio-серверы для health-check и при проблемах с
 * authentication-токеном/демоном клиента может зависнуть. Без таймаута CLI
 * застывает намертво.
 */
const CLAUDE_MCP_LIST_TIMEOUT_MS = 5000;

/**
 * Маркеры статуса в выводе `claude mcp list`.
 *
 * Claude Code 2.x печатает U+2714 HEAVY CHECK MARK (`✔`), а не U+2713 (`✓`).
 * Пока принимался только U+2713, подключённый сервер не распознавался никогда
 * и уходил в ветку «неизвестное состояние» — `status` показывал «❗ Ошибка»
 * при полностью рабочем подключении. Тесты повторяли ту же ошибку в фикстурах,
 * поэтому расхождение не всплывало. Принимаем оба начертания.
 *
 * Кресты — по симметрии: U+2717 наблюдался в прежних сборках, U+2718 добавлен
 * защитно (вживую не воспроизведён).
 */
const CONNECTED_MARKS = ['✓', '✔'] as const;
const FAILED_MARKS = ['✗', '✘'] as const;

/**
 * Лимит итераций цикла «get → remove» в {@link ClaudeCodeConnector.disconnect}.
 * scope всего три (`user`/`project`/`local`); 4-я итерация — defensive against
 * бесконечного цикла при неожиданных ответах CLI.
 */
const MAX_DISCONNECT_ITERATIONS = 4;

/**
 * Подстрока, по которой отличается «записи нет» от прочих ошибок `claude mcp get`.
 *
 * Снято с реального вывода CLI 2.x: `No MCP server named "<name>". Configured
 * servers: ...`. Это единственный сигнал, различающий «сервера с таким именем
 * нет» от прочих сбоев (падение процесса, битый `~/.claude.json`) — сам CLI
 * не даёт структурированного кода ошибки. Если формулировка изменится в
 * будущей версии CLI — деградация безопасна: исход просто попадёт в
 * `commandFailed` вместо `notConnected` (более консервативная, а не более
 * опасная классификация).
 */
const NOT_FOUND_MARKER = 'No MCP server named';

/**
 * Внутренний результат {@link ClaudeCodeConnector.runGet} — отличает «записи
 * нет» от «команда упала по другой причине», не раскрывая сырой вывод дальше
 * необходимого (вывод при успехе может содержать env).
 */
type RawGetResult =
  | { kind: 'ok'; output: string }
  | { kind: 'notFound' }
  | { kind: 'commandFailed'; message: string };

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
   * Получить статус подключения через парсинг `claude mcp list` + обогащение
   * scope из `claude mcp get`.
   *
   * Состояния:
   *  - `✔`/`✓ Connected` → connected: true
   *  - `✗ Failed to connect` → connected: false, error: 'Failed to connect'
   *  - `! Needs authentication` → connected: false, error: 'Needs authentication'
   *  - неизвестное → connected: false, error: `Unknown state: <raw>` (для диагностики)
   *  - сервер отсутствует в выводе → connected: false
   *  - таймаут → connected: false, error: 'Timeout: ...'
   */
  async getStatus(): Promise<ConnectionStatus> {
    let output: string;
    try {
      output = CommandExecutor.execFile('claude', ['mcp', 'list'], {
        timeout: CLAUDE_MCP_LIST_TIMEOUT_MS,
      });
    } catch (error) {
      return {
        connected: false,
        error: `Ошибка проверки статуса: ${isError(error) ? error.message : String(error)}`,
      };
    }

    const status = this.parseStatusFromList(output);
    // Дополняем scope, если запись присутствует. `get` дешёвый и не запускает
    // health-check, поэтому делаем второй вызов только если в list-выводе
    // действительно есть наша строка (status.details уже выставлен).
    if (status.details) {
      const scope = await this.getCurrentScope();
      if (scope) {
        status.details = { ...status.details, scope };
      }
    }
    return status;
  }

  /**
   * Подключить MCP сервер через `claude mcp add --scope user`.
   *
   * Формирует команду вида:
   *   claude mcp add --scope user --transport stdio <name> [--env K=V ...] -- <command> [<args>...]
   *
   * Использование `--scope user` (вместо CLI default `local`) обеспечивает
   * доступность сервера из любой директории и единое стабильное место хранения.
   * Это сознательное отклонение от дефолта `claude mcp`.
   *
   * Перед `add` проверяет существование записи в любом scope через
   * {@link getCurrentScope}. Если запись уже есть — бросает Error с подсказкой
   * пользователю запустить `disconnect`, чтобы избежать дубликатов между scope
   * (`claude mcp add` без проверки молча создаёт дубли).
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

    const existingScope = await this.getCurrentScope();
    if (existingScope !== null) {
      throw new Error(
        `Сервер "${this.serverName}" уже зарегистрирован в claude-code (scope: ${existingScope}). ` +
          `Запустите disconnect или удалите вручную: claude mcp remove "${this.serverName}" -s ${existingScope}`
      );
    }

    const args: string[] = [
      'mcp',
      'add',
      '--scope',
      'user',
      '--transport',
      'stdio',
      this.serverName,
    ];

    for (const [key, value] of Object.entries(spec.env)) {
      args.push('--env', `${key}=${value}`);
    }

    args.push('--', spec.command, ...spec.args);

    await CommandExecutor.execInteractive('claude', args);
  }

  /**
   * Отключить MCP сервер.
   *
   * Алгоритм: цикл `get` → `remove --scope <scope>` пока запись существует.
   * Это позволяет корректно вычистить случай, когда запись присутствует в
   * нескольких scope (исторический баг ранних версий коннектора, где `add`
   * мог создать дубликаты между local и user).
   *
   * Если запись не найдена ни в одном scope — бросает Error.
   */
  async disconnect(): Promise<void> {
    let removedAny = false;
    for (let iteration = 0; iteration < MAX_DISCONNECT_ITERATIONS; iteration++) {
      const scope = await this.getCurrentScope();
      if (scope === null) {
        if (!removedAny) {
          throw new Error(
            `Сервер "${this.serverName}" не зарегистрирован в claude-code (ни в одном scope).`
          );
        }
        return;
      }
      await CommandExecutor.execInteractive('claude', [
        'mcp',
        'remove',
        '--scope',
        scope,
        this.serverName,
      ]);
      removedAny = true;
    }
    // Защитный выход — не должен срабатывать при нормальном поведении CLI.
    throw new Error(
      `Не удалось полностью отключить "${this.serverName}" за ${String(MAX_DISCONNECT_ITERATIONS)} итераций.`
    );
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
   * @returns {@link GetLaunchSpecResult} — `found`/`notConnected`/`notStdio`/
   *          `unparsable`/`commandFailed` (см. типовой JSDoc).
   */
  getLaunchSpec(): Promise<GetLaunchSpecResult> {
    const result = this.runGet();
    if (result.kind === 'notFound') return Promise.resolve({ outcome: 'notConnected' });
    if (result.kind === 'commandFailed') {
      return Promise.resolve({ outcome: 'commandFailed', message: result.message });
    }
    return Promise.resolve(this.parseLaunchSpecFromGet(result.output));
  }

  // ----- internal -----

  /**
   * Выполнить `claude mcp get <name>` с таймаутом.
   *
   * Различает три исхода (см. {@link RawGetResult}): успех, «записи нет»
   * (детектируется по {@link NOT_FOUND_MARKER} в тексте ошибки) и «команда
   * упала по другой причине» (таймаут, битый конфиг, неожиданный сбой CLI).
   */
  private runGet(): RawGetResult {
    try {
      const output = CommandExecutor.execFile('claude', ['mcp', 'get', this.serverName], {
        timeout: CLAUDE_MCP_LIST_TIMEOUT_MS,
      });
      return { kind: 'ok', output };
    } catch (error) {
      const message = isError(error) ? error.message : String(error);
      if (message.includes(NOT_FOUND_MARKER)) {
        return { kind: 'notFound' };
      }
      return { kind: 'commandFailed', message };
    }
  }

  /**
   * Определить scope текущей записи через `claude mcp get`.
   *
   * Если запись существует в нескольких scope (исторический баг),
   * `claude mcp get` показывает один — приоритетный (local > project > user).
   * Этого достаточно для итеративного `disconnect`: одной итерации хватает,
   * чтобы убрать запись из показанного scope, а следующая увидит следующий.
   *
   * Оба «отрицательных» исхода `runGet` (`notFound` и `commandFailed`)
   * трактуются одинаково — `null` — как и до введения {@link GetLaunchSpecResult}:
   * connect/disconnect не различают их семантику, им важно только «есть/нет».
   *
   * @returns scope или `null`, если запись отсутствует / команда не удалась /
   *          парсинг неудачен.
   */
  private async getCurrentScope(): Promise<ClaudeCodeScope | null> {
    const result = this.runGet();
    if (result.kind !== 'ok') return null;
    return Promise.resolve(this.parseScopeFromGet(result.output));
  }

  /**
   * Извлечь scope из вывода `claude mcp get`.
   *
   * Формат строки: `  Scope: Local config (private to you in this project)`.
   * Метки в выводе CLI 2.x:
   *  - `Local config ...`   → `local`
   *  - `User config ...`    → `user`
   *  - `Project config ...` → `project`
   */
  private parseScopeFromGet(output: string): ClaudeCodeScope | null {
    const lines = output.split('\n').map((l) => l.trim());
    const scopeLine = lines.find((l) => l.startsWith('Scope:'));
    if (!scopeLine) return null;
    const value = scopeLine.slice('Scope:'.length).trim().toLowerCase();
    if (value.startsWith('local')) return 'local';
    if (value.startsWith('user')) return 'user';
    if (value.startsWith('project')) return 'project';
    return null;
  }

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

    if (CONNECTED_MARKS.some((mark) => statusPart.startsWith(mark))) {
      return {
        connected: true,
        details: { configPath: 'managed by claude mcp' },
      };
    }
    if (FAILED_MARKS.some((mark) => statusPart.startsWith(mark))) {
      // распространённый вариант: `✗ Failed to connect`
      return {
        connected: false,
        error: statusPart.replace(/^[✗✘]\s*/u, ''),
        details: { configPath: 'managed by claude mcp' },
      };
    }
    if (statusPart.startsWith('!')) {
      return {
        connected: false,
        error: statusPart.replace(/^!\s*/, ''),
        details: { configPath: 'managed by claude mcp' },
      };
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
  private parseLaunchSpecFromGet(output: string): GetLaunchSpecResult {
    const rawLines = output.split('\n');
    const trimmedLines = rawLines.map((l) => l.trim());
    const findValue = (label: string): string | undefined => {
      const prefix = `${label}:`;
      const line = trimmedLines.find((l) => l.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : undefined;
    };

    const type = findValue('Type');
    if (type && type.toLowerCase() !== 'stdio') {
      return { outcome: 'notStdio', transport: type };
    }

    const command = findValue('Command');
    if (!command) {
      return {
        outcome: 'unparsable',
        reason: 'В выводе `claude mcp get` не найдено поле `Command` — формат CLI мог измениться',
      };
    }

    const argsLine = findValue('Args') ?? '';
    const args = argsLine.length > 0 ? argsLine.split(/\s+/).filter((a) => a.length > 0) : [];

    const env = this.parseEnvSection(rawLines);

    return { outcome: 'found', spec: { command, args, env } };
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
