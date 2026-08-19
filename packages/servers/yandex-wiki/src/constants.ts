/**
 * Префикс для всех MCP tools Yandex Wiki
 * @example "yw_get_page"
 */
export const MCP_TOOL_PREFIX = 'yw_' as const;

/**
 * Base URL API Yandex Wiki — публичный compile-time дефолт (часть публичного
 * экспорта пакета, см. index.ts). Фактическое значение, используемое
 * HTTP-клиентом, вычисляется в loadConfig() (src/config/config-loader.ts) и
 * может быть переопределено переменной окружения YANDEX_WIKI_API_BASE —
 * см. DEFAULT_API_BASE в src/config/constants.ts.
 */
export const YANDEX_WIKI_API_BASE = 'https://api.wiki.yandex.net';

/**
 * Базовое имя проекта для CLI
 */
export const PROJECT_BASE_NAME = 'fractalizer_mcp_yandex_wiki';

/**
 * Технический идентификатор MCP сервера (используется в конфигурации клиентов)
 */
export const MCP_SERVER_NAME = PROJECT_BASE_NAME;

/**
 * Отображаемое имя MCP сервера (показывается в UI клиентов)
 */
export const MCP_SERVER_DISPLAY_NAME = "FractalizeR's Yandex Wiki MCP" as const;

/**
 * Уровень логирования по умолчанию
 */
export const DEFAULT_LOG_LEVEL = 'info';

/**
 * Потолок размера вложения для `yw_upload_attachment` (10 МБ).
 *
 * Живёт здесь, а не рядом с операцией: значение — часть контракта инструмента.
 * Операция его проверяет, а схема и метаданные инструмента его декларируют
 * агенту; общий источник должен быть доступен обеим сторонам, не заставляя
 * слой tools импортировать api_operations.
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
