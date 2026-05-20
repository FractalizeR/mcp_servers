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
