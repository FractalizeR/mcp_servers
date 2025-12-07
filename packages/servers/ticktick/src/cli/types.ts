import type { BaseMCPServerConfig } from '@mcp-framework/cli';

/**
 * Конфигурация MCP сервера TickTick
 */
export interface TickTickMCPConfig extends BaseMCPServerConfig {
  /** OAuth Client ID */
  clientId: string;

  /** OAuth Client Secret */
  clientSecret: string;

  /** OAuth Redirect URI */
  redirectUri?: string;

  /** Уровень логирования */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
