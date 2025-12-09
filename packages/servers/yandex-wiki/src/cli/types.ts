import type { BaseMCPServerConfig } from '@fractalizer/mcp-cli';

/**
 * Конфигурация MCP сервера Yandex Wiki
 */
export interface YandexWikiMCPConfig extends BaseMCPServerConfig {
  /** OAuth токен Yandex Wiki */
  token: string;

  /** ID организации */
  orgId: string;

  /** Таймаут запросов (опционально) */
  requestTimeout?: number;
}
