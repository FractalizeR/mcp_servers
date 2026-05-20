/**
 * Десериализация сохранённой конфигурации Yandex Wiki.
 *
 * Отвечает за миграцию старых config.json (без поля `orgType`) в формат текущей
 * версии CLI и валидацию читаемых значений.
 */

import type { OrgType, YandexWikiMCPConfig } from './types.js';

const KNOWN_ORG_TYPES: readonly OrgType[] = ['yandex360', 'cloud'];

/**
 * Преобразовать сырые данные из config.json в `Partial<YandexWikiMCPConfig>`.
 *
 * Миграции:
 *  - Отсутствие `orgType` → подставить `'yandex360'`. Прежнее поведение
 *    (одна env-переменная `YANDEX_ORG_ID`). Пользователи Yandex Cloud
 *    при первом `connect` после апгрейда явно выберут `cloud` в новом промпте.
 *  - Неизвестное значение `orgType` → поле опускается; пользователь введёт
 *    корректное значение через промпт.
 *
 * Возвращает `Partial`: token не сохраняется на диск и приходит из промпта;
 * остальные поля могут отсутствовать.
 */
export function deserializeYwConfig(data: Record<string, unknown>): Partial<YandexWikiMCPConfig> {
  const result: Partial<YandexWikiMCPConfig> = {};

  const rawOrgType = data['orgType'];
  if (typeof rawOrgType === 'string') {
    if (KNOWN_ORG_TYPES.includes(rawOrgType as OrgType)) {
      result.orgType = rawOrgType as OrgType;
    } else {
      // Неизвестное значение игнорируем, но предупреждаем. Logger не доступен
      // на этом уровне (deserialize вызывается из ConfigManager до инициализации
      // приложения), поэтому используем `console.warn` в stderr.
      console.warn(
        `[deserializeYwConfig] Неизвестное значение orgType="${rawOrgType}" в config.json — поле опущено. ` +
          `Ожидалось одно из: ${KNOWN_ORG_TYPES.join(', ')}.`
      );
    }
  } else if (rawOrgType === undefined) {
    result.orgType = 'yandex360';
  }

  if (typeof data['orgId'] === 'string') {
    result.orgId = data['orgId'];
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
  } else if (rawLogLevel !== undefined) {
    console.warn(
      `[deserializeYwConfig] Неизвестное значение logLevel=${JSON.stringify(rawLogLevel)} в config.json — поле опущено. ` +
        `Ожидалось одно из: debug, info, warn, error.`
    );
  }

  return result;
}
