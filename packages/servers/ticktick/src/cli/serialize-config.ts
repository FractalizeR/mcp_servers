/**
 * Сериализация доменной конфигурации TickTick в JSON для записи в файл.
 *
 * Политика безопасности: `clientSecret` (секрет OAuth-приложения) НИКОГДА
 * не сохраняется на диск. Пользователь вводит его заново при каждом `connect`.
 */

import type { TickTickMCPConfig } from './types.js';

/**
 * Собрать объект для записи в `~/.fractalizer_mcp_ticktick/config.json`.
 *
 * Сохраняются только non-secret поля: `clientId`, `redirectUri`, `logLevel`.
 * `undefined`-значения опускаются, чтобы файл не засорялся пустыми ключами.
 */
export function serializeTickTickConfig(config: TickTickMCPConfig): Record<string, unknown> {
  const data: Record<string, unknown> = {
    clientId: config.clientId,
  };

  if (config.redirectUri !== undefined) {
    data['redirectUri'] = config.redirectUri;
  }
  if (config.logLevel !== undefined) {
    data['logLevel'] = config.logLevel;
  }

  return data;
}
