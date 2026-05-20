/**
 * Десериализация сохранённой конфигурации TickTick.
 *
 * Тривиальный валидатор: специальной миграции нет (orgType отсутствует
 * в OAuth-модели), но валидируем типы каждого поля для устойчивости к
 * ручным правкам config.json.
 */

import type { TickTickMCPConfig } from './types.js';

/**
 * Преобразовать сырые данные из config.json в `Partial<TickTickMCPConfig>`.
 *
 * Возвращает `Partial`: `clientSecret` не сохраняется на диск и приходит из
 * промпта, остальные поля могут отсутствовать.
 */
export function deserializeTickTickConfig(
  data: Record<string, unknown>
): Partial<TickTickMCPConfig> {
  const result: Partial<TickTickMCPConfig> = {};

  if (typeof data['clientId'] === 'string') {
    result.clientId = data['clientId'];
  }
  if (typeof data['redirectUri'] === 'string') {
    result.redirectUri = data['redirectUri'];
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
