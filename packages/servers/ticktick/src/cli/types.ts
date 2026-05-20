/**
 * Конфигурация MCP сервера TickTick.
 *
 * Доменная модель CLI: формируется в результате интерактивных промптов и
 * частично сохраняется в `~/.fractalizer_mcp_ticktick/config.json` (без
 * секретов — см. `serializeTickTickConfig`).
 */
export interface TickTickMCPConfig {
  /** OAuth Client ID (из TickTick Developer Portal) */
  clientId: string;

  /** OAuth Client Secret (СЕКРЕТ — не сохраняется на диск) */
  clientSecret: string;

  /** OAuth Redirect URI (опционально, по умолчанию http://localhost:8080/callback) */
  redirectUri?: string;

  /** Уровень логирования (опционально) */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
