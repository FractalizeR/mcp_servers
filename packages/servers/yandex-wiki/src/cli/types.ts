/**
 * Тип организации Яндекс (для Wiki API).
 *
 * Определяет, в какую env-переменную попадёт `orgId` при запуске сервера:
 *  - `yandex360` → `YANDEX_ORG_ID` (Яндекс 360 для бизнеса);
 *  - `cloud`     → `YANDEX_CLOUD_ORG_ID` (Yandex Cloud Organization).
 *
 * Mutually exclusive — сервер отвергает конфиг с обеими переменными
 * (`validateOrgIds` в `src/config/config-loader.ts`).
 */
export type OrgType = 'yandex360' | 'cloud';

/**
 * Конфигурация MCP сервера Yandex Wiki.
 *
 * Доменная модель CLI: формируется в результате интерактивных промптов и
 * сохраняется в `~/.fractalizer_mcp_yandex_wiki/config.json` (без секретов — см.
 * `serializeYwConfig`).
 */
export interface YandexWikiMCPConfig {
  /** OAuth токен Yandex Wiki */
  token: string;

  /** Тип организации (определяет имя env-переменной для `orgId`) */
  orgType: OrgType;

  /** Идентификатор организации (для выбранного `orgType`) */
  orgId: string;

  /** Таймаут запросов в миллисекундах (опционально) */
  requestTimeout?: number;

  /** Уровень логирования (опционально) */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
