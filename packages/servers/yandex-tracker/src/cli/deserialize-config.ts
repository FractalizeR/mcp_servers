/**
 * Десериализация сохранённой конфигурации Yandex Tracker.
 *
 * Отвечает за миграцию старых config.json (без поля `orgType`) в формат текущей
 * версии CLI и валидацию читаемых значений.
 */

import type { OrgType, YandexTrackerMCPConfig } from './types.js';

const KNOWN_ORG_TYPES: readonly OrgType[] = ['yandex360', 'cloud'];

/**
 * Преобразовать сырые данные из config.json в `Partial<YandexTrackerMCPConfig>`.
 *
 * Миграции:
 *  - Отсутствие `orgType` → подставить `'yandex360'`. Прежнее поведение сервера
 *    (без выбора Cloud) — это единственная env-переменная `YANDEX_ORG_ID`.
 *    Пользователи, фактически работающие с Yandex Cloud, при первом `connect`
 *    после апгрейда явно выберут `cloud` в новом промпте.
 *  - Неизвестное значение `orgType` → поле опускается; пользователь введёт
 *    корректное значение через промпт.
 *
 * Возвращает `Partial`: token не сохраняется на диск и приходит из промпта;
 * остальные поля могут отсутствовать.
 */
export function deserializeYtConfig(
  data: Record<string, unknown>
): Partial<YandexTrackerMCPConfig> {
  const result: Partial<YandexTrackerMCPConfig> = {};

  const rawOrgType = data['orgType'];
  if (typeof rawOrgType === 'string') {
    if (KNOWN_ORG_TYPES.includes(rawOrgType as OrgType)) {
      result.orgType = rawOrgType as OrgType;
    }
    // неизвестное значение игнорируем
  } else if (rawOrgType === undefined) {
    // Миграция со старого формата без orgType.
    result.orgType = 'yandex360';
  }

  if (typeof data['orgId'] === 'string') {
    result.orgId = data['orgId'];
  }
  if (typeof data['apiBase'] === 'string') {
    result.apiBase = data['apiBase'];
  }
  if (typeof data['requestTimeout'] === 'number') {
    result.requestTimeout = data['requestTimeout'];
  }
  const rawLogLevel = data['logLevel'];
  if (
    rawLogLevel === 'debug' ||
    rawLogLevel === 'info' ||
    rawLogLevel === 'warn' ||
    rawLogLevel === 'error'
  ) {
    result.logLevel = rawLogLevel;
  }

  return result;
}
