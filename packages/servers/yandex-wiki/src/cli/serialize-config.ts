/**
 * Сериализация доменной конфигурации Yandex Wiki в JSON для записи в файл.
 *
 * Политика безопасности: `token` (секрет) НИКОГДА не сохраняется. Пользователь
 * вводит токен заново при каждом `connect`.
 */

import type { YandexWikiMCPConfig } from './types.js';

/**
 * Собрать объект для записи в `~/.fractalizer_mcp_yandex_wiki/config.json`.
 *
 * Сохраняются только non-secret поля: `orgType`, `orgId`, `requestTimeout`,
 * `logLevel`. `undefined`-значения опускаются, чтобы файл не засорялся пустыми
 * ключами.
 */
export function serializeYwConfig(config: YandexWikiMCPConfig): Record<string, unknown> {
  const data: Record<string, unknown> = {
    orgType: config.orgType,
    orgId: config.orgId,
  };

  if (config.requestTimeout !== undefined) {
    data['requestTimeout'] = config.requestTimeout;
  }
  if (config.logLevel !== undefined) {
    data['logLevel'] = config.logLevel;
  }

  return data;
}
