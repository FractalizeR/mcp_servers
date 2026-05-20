/**
 * Тип организации Яндекс.Трекера.
 *
 * Определяет, в какую env-переменную попадёт `orgId` при запуске сервера:
 *  - `yandex360` → `YANDEX_ORG_ID` (Яндекс 360 для бизнеса);
 *  - `cloud`     → `YANDEX_CLOUD_ORG_ID` (Yandex Cloud Organization).
 *
 * Mutually exclusive — сервер отвергает конфиг с обеими переменными
 * (см. `validateOrgIds` в `src/config/config-loader.ts`).
 */
export type OrgType = 'yandex360' | 'cloud';

/**
 * Конфигурация MCP сервера Yandex Tracker.
 *
 * Доменная модель CLI: формируется в результате интерактивных промптов и
 * сохраняется в `~/.fractalizer_mcp_yandex_tracker/config.json` (без секретов
 * — см. `serializeYtConfig`).
 */
export interface YandexTrackerMCPConfig {
  /** OAuth токен Яндекс.Трекера */
  token: string;

  /** Тип организации (определяет имя env-переменной для `orgId`) */
  orgType: OrgType;

  /** Идентификатор организации (для выбранного `orgType`) */
  orgId: string;

  /** Базовый URL API (опционально) */
  apiBase?: string;

  /** Таймаут запросов в миллисекундах (опционально) */
  requestTimeout?: number;

  /** Уровень логирования (опционально) */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
