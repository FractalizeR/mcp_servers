/**
 * Конфигурация HTTP клиента
 *
 * Содержит параметры для инициализации Axios instance
 */

export interface HttpConfig {
  /** Базовый URL API (например, 'https://api.tracker.yandex.net') */
  baseURL: string;

  /** Таймаут запросов в миллисекундах */
  timeout: number;

  /** OAuth токен для авторизации */
  token: string;

  /** ID организации (Яндекс 360 для бизнеса) */
  orgId?: string;

  /** ID организации (Yandex Cloud Organization) */
  cloudOrgId?: string;
}
