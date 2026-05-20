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

  /** Аргументы команды (включая путь к скрипту и Node-флаги при необходимости) */
  args: string[];

  /** Переменные окружения, передаваемые серверу */
  env: Record<string, string>;
}
