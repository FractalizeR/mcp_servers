import type { BaseMCPServerConfig } from '@mcp-framework/cli';

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
