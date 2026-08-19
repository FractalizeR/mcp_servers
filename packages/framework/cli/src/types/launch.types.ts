/**
 * Launch specification types for MCP servers (framework-agnostic)
 * @packageDocumentation
 */

/**
 * Спецификация запуска MCP сервера
 *
 * Готовая «команда + аргументы + переменные окружения» для записи в конфиг клиента.
 * Публичный контракт между вызывающим кодом (адаптером домена) и framework: framework
 * ничего не знает о доменных полях, оперируя только `ServerLaunchSpec`.
 *
 * Структурно совпадает с `MCPClientServerConfig` (internal), но логически выполняет
 * другую роль: spec — это вход в `connector.connect()`, а `MCPClientServerConfig` — формат
 * записи в JSON/TOML файлах клиентов.
 *
 * @example
 * ```typescript
 * const spec: ServerLaunchSpec = {
 *   command: 'node',
 *   args: ['/abs/path/dist/server.bundle.cjs'],
 *   env: { API_TOKEN: 'xxx', ORG_ID: 'my-org' },
 * };
 *
 * await connector.connect(spec);
 * ```
 */
export interface ServerLaunchSpec {
  /** Команда для запуска (обычно `node` или абсолютный путь к исполняемому файлу) */
  command: string;

  /**
   * Аргументы команды (включая путь к скрипту и Node-флаги при необходимости).
   *
   * `readonly` — гарантия неизменяемости. Если коннектору нужно изменить
   * массив, он должен сделать локальную копию.
   */
  args: readonly string[];

  /** Переменные окружения, передаваемые серверу */
  env: Record<string, string>;

  /**
   * Рабочая директория для процесса сервера (опционально).
   *
   * Если задано — должно быть абсолютным путём. Поддержка зависит от конкретного
   * клиента: для file-based клиентов (Claude Desktop, Gemini, Qwen, Codex)
   * сохраняется в конфиге и читается обратно; для Claude Code не поддерживается
   * (выводится warning).
   *
   * Если `undefined` — поле не пишется в конфиг, наследуется текущий cwd процесса.
   */
  cwd?: string;

  /**
   * Метка «сервер выключен» (опционально). Если `true`, клиент НЕ должен
   * запускать процесс сервера. Поддержка зависит от клиента: file-based клиенты
   * пишут поле в JSON/TOML; Claude Code эту опцию не поддерживает (warning).
   *
   * Если `undefined` — поле не пишется в конфиг (по умолчанию активный).
   */
  disabled?: boolean;
}

/**
 * Различимые исходы {@link MCPConnector.getLaunchSpec} (`connectors/base/connector.interface.ts`).
 *
 * До этого типа метод схлопывал четыре разные причины отсутствия spec в один
 * `null`: записи нет, транспорт не stdio, вывод клиента не разобран, сама
 * команда чтения записи (для CLI-based клиентов вроде Claude Code) упала или
 * истекла по таймауту. Разные причины требуют разной реакции у потребителя
 * (например, `mcp-dev` из пакета `@fractalizer/mcp-dev-client` должен показать
 * разный текст ошибки), поэтому объединены в discriminated union по полю
 * `outcome`.
 *
 * `unparsable` не несёт сырой вывод клиента — он может содержать `env` записи
 * (секреты); только безопасное для печати описание причины.
 *
 * `commandFailed`, в отличие от него, **может нести фрагмент stderr упавшей
 * команды**: `CommandExecutor` подмешивает в сообщение до `STDERR_PREVIEW_LIMIT`
 * символов stderr (`utils/command-executor.ts`). Сейчас `claude mcp get` при
 * ошибке `env` в stderr не печатает, то есть известной утечки нет, — но
 * гарантией это не является, и потребитель обязан считать `message` этого
 * исхода потенциально чувствительным: не печатать его дословно и пропускать
 * через маскер, если тот доступен. Так и поступает `mcp-dev` из
 * `@fractalizer/mcp-dev-client` — он заменяет текст на инструкцию проверить
 * запись вручную.
 *
 * @example
 * ```typescript
 * const result = await connector.getLaunchSpec();
 * if (result.outcome === 'found') {
 *   await connect(result.spec);
 * }
 * ```
 */
export type GetLaunchSpecResult =
  | {
      /** Запись найдена и разобрана — {@link ServerLaunchSpec} готова к использованию */
      readonly outcome: 'found';
      readonly spec: ServerLaunchSpec;
    }
  | {
      /** Сервер не зарегистрирован в этом клиенте (ни в одном из scope) */
      readonly outcome: 'notConnected';
    }
  | {
      /** Запись есть, но транспорт не stdio (например, `http`/`sse`) — `mcp-dev` не умеет запускать такие серверы локально */
      readonly outcome: 'notStdio';
      readonly transport: string;
    }
  | {
      /** Запись есть и транспорт stdio, но структуру вывода клиента не удалось разобрать (формат изменился) */
      readonly outcome: 'unparsable';
      readonly reason: string;
    }
  | {
      /** Команда чтения записи (например, `claude mcp get`) завершилась с ошибкой или истекла по таймауту */
      readonly outcome: 'commandFailed';
      readonly message: string;
    };
