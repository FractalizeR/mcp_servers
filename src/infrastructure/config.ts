/**
 * Загрузка и валидация конфигурации из переменных окружения
 */

import type { ServerConfig, LogLevel } from '@types';

/**
 * Валидация уровня логирования
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return 'info'; // дефолтное значение
}

/**
 * Валидация и парсинг таймаута
 */
function validateTimeout(timeout: string | undefined, defaultValue: number): number {
  if (!timeout) {
    return defaultValue;
  }

  const parsed = parseInt(timeout, 10);
  if (isNaN(parsed) || parsed < 5000 || parsed > 120000) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация и парсинг максимального размера batch-запроса
 */
function validateMaxBatchSize(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация и парсинг максимального количества одновременных запросов
 */
function validateMaxConcurrentRequests(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 20) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация ID организации
 * @throws {Error} если ID не указаны или указаны оба одновременно
 */
function validateOrgIds(
  orgId: string | undefined,
  cloudOrgId: string | undefined
): { orgId?: string; cloudOrgId?: string } {
  const hasOrgId = orgId && orgId.trim() !== '';
  const hasCloudOrgId = cloudOrgId && cloudOrgId.trim() !== '';

  if (!hasOrgId && !hasCloudOrgId) {
    throw new Error(
      'Необходимо указать ID организации. ' +
      'Используйте YANDEX_ORG_ID (для Яндекс 360 для бизнеса) ' +
      'или YANDEX_CLOUD_ORG_ID (для Yandex Cloud Organization).'
    );
  }

  if (hasOrgId && hasCloudOrgId) {
    throw new Error(
      'Нельзя использовать YANDEX_ORG_ID и YANDEX_CLOUD_ORG_ID одновременно. ' +
      'Укажите только один из них.'
    );
  }

  return {
    orgId: hasOrgId ? orgId.trim() : undefined,
    cloudOrgId: hasCloudOrgId ? cloudOrgId.trim() : undefined,
  };
}

/**
 * Загрузка конфигурации из переменных окружения
 * @throws {Error} если обязательные переменные не установлены
 */
export function loadConfig(): ServerConfig {
  const token = process.env['YANDEX_TRACKER_TOKEN'];

  if (!token || token.trim() === '') {
    throw new Error(
      'YANDEX_TRACKER_TOKEN не установлен. ' +
      'Получите OAuth токен в настройках Яндекс и добавьте в конфигурацию.'
    );
  }

  // Валидация ID организации (выбрасывает ошибку при проблемах)
  const validatedOrgIds = validateOrgIds(
    process.env['YANDEX_ORG_ID'],
    process.env['YANDEX_CLOUD_ORG_ID']
  );

  // Используем || для дефолтных значений, так как пустая строка должна быть заменена
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const apiBase = process.env['YANDEX_TRACKER_API_BASE']?.trim() || 'https://api.tracker.yandex.net';
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const logLevel = validateLogLevel(process.env['LOG_LEVEL']?.trim() || 'info');
  const requestTimeout = validateTimeout(process.env['REQUEST_TIMEOUT'], 30000);
  const maxBatchSize = validateMaxBatchSize(process.env['MAX_BATCH_SIZE'], 200);
  const maxConcurrentRequests = validateMaxConcurrentRequests(process.env['MAX_CONCURRENT_REQUESTS'], 5);

  return {
    token: token.trim(),
    ...validatedOrgIds,
    apiBase: apiBase.trim(),
    logLevel,
    requestTimeout,
    maxBatchSize,
    maxConcurrentRequests,
  };
}
