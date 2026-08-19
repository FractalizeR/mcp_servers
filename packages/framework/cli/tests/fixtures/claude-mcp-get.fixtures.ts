/**
 * Фикстуры реального вывода `claude mcp get <name>` / `claude mcp list`.
 *
 * Сняты на живой машине (Claude Code CLI 2.x, `claude --version`), значения
 * секретов заменены на плейсхолдеры того же формата (значения не несут
 * диагностической ценности для парсера — важна структура строк и отступов).
 *
 * Наблюдение, отличающее реальный вывод от синтетических фикстур в
 * `claude-code.test.ts`: иконка успеха в текущей версии CLI — `✔` (U+2714),
 * не `✓` (U+2713), который используют остальные тесты этого файла (сняты на
 * более ранней версии CLI). `parseLaunchSpecFromGet` эту иконку не читает —
 * `Status:` не участвует в разборе launch spec, поэтому расхождение не влияет
 * на пакет 1.1. Расхождение и его влияние на `parseStatusFromList`
 * (`claude mcp list`, отдельный парсер) — вне границ этого пакета, см. отчёт.
 */

/**
 * Реальный вывод `claude mcp get fractalizer_mcp_yandex_tracker` (user scope,
 * stdio, многострочный `Environment:`).
 */
export const REAL_MCP_GET_STDIO_USER_SCOPE = `fractalizer_mcp_yandex_tracker:
  Scope: User config (available in all your projects)
  Status: ✔ Connected
  Type: stdio
  Command: node
  Args: /Users/fractalizer/PhpstormProjects/github.com/FractalizeR/mcp_servers/packages/servers/yandex-tracker/dist/yandex-tracker.bundle.cjs
  Environment:
    YANDEX_TRACKER_TOKEN=FAKE_TOKEN_VALUE
    YANDEX_ORG_ID=FAKE_ORG_ID_VALUE
    LOG_LEVEL=FAKE_LOG_LEVEL_VALUE

To remove this server, run: claude mcp remove fractalizer_mcp_yandex_tracker -s user`;

/**
 * Реальный вывод `claude mcp get <name>`, когда запись отсутствует ни в одном
 * scope (exit code 1). `claude` печатает список всех настроенных имён — это
 * единственный структурированный сигнал «записи нет», не имена не являются
 * секретом (это метки серверов, не значения env).
 */
export const REAL_MCP_GET_NOT_FOUND =
  'No MCP server named "nonexistent-server-xyz-test". Configured servers: claude.ai Gmail, ' +
  'claude.ai Google Calendar, claude.ai Google Drive, fractalizer_mcp_yandex_tracker, ' +
  'fractalizer_mcp_yandex_wiki, phpstorm, sentry';

/**
 * Реальный вывод `claude mcp list` (health-check строки, укороченный список).
 * Иконка успеха — `✔`, не `✓` (см. шапку файла).
 */
export const REAL_MCP_LIST_OUTPUT = `Checking MCP server health…

sentry: npx @sentry/mcp-server - ✔ Connected
fractalizer_mcp_yandex_tracker: node /Users/fractalizer/PhpstormProjects/github.com/FractalizeR/mcp_servers/packages/servers/yandex-tracker/dist/yandex-tracker.bundle.cjs - ✔ Connected
fractalizer_mcp_yandex_wiki: node /Users/fractalizer/PhpstormProjects/github.com/FractalizeR/mcp_servers/packages/servers/yandex-wiki/dist/yandex-wiki.bundle.cjs - ✔ Connected`;
