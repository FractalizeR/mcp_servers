/**
 * Конфигурация HTTP клиента
 *
 * Содержит параметры для инициализации Axios instance
 */

import type { HttpTrafficGuard } from './http-traffic-guard.interface.js';

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

  /**
   * Надзор за исходящим трафиком: отклоняет запросы вне разрешённой области
   * действия до сети. Отсутствие поля оставляет поведение без изменений.
   */
  trafficGuard?: HttpTrafficGuard;
}
