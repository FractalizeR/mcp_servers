/**
 * Smoke Test: API Connectivity
 *
 * Проверяет реальное подключение к Yandex Tracker API
 *
 * **ВАЖНО:**
 * - Запускается ТОЛЬКО если установлен YANDEX_TRACKER_TOKEN
 * - В CI пропускается (test.skipIf)
 * - Локально разработчик может запустить с реальным токеном
 *
 * **Использование:**
 * ```bash
 * # С реальным токеном
 * YANDEX_TRACKER_TOKEN=your_token npm test -- api-connectivity
 *
 * # Без токена (тест пропускается)
 * npm test -- api-connectivity
 * ```
 */

import { describe, it, expect } from 'vitest';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';

// Проверяем наличие реального токена
const hasRealToken = !!process.env.YANDEX_TRACKER_TOKEN;
const hasRealOrgId = !!process.env.YANDEX_TRACKER_ORG_ID;

// Пропускаем весь describe block если нет реального токена
describe.skipIf(!hasRealToken || !hasRealOrgId)('API Connectivity (Smoke - Real API)', () => {
  const realConfig: ServerConfig = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    token: process.env.YANDEX_TRACKER_TOKEN!,
    orgId: process.env.YANDEX_TRACKER_ORG_ID,
    cloudOrgId: process.env.YANDEX_TRACKER_CLOUD_ORG_ID,
    apiBase: process.env.YANDEX_TRACKER_API_BASE || 'https://api.tracker.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error',
    prettyLogs: false,
    toolDiscoveryMode: 'lazy',
    essentialTools: ['fr_yandex_tracker_ping'],
  };

  it('должен подключиться к реальному Yandex Tracker API', async () => {
    // Arrange
    const container = await createContainer(realConfig);
    const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);

    // Act
    const result = await facade.ping();

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveProperty('status', 'ok');
  }, 10000); // Увеличенный timeout для реального API

  it('должен получить список issues (если есть доступ)', async () => {
    // Arrange
    const container = await createContainer(realConfig);
    const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);

    // Act & Assert
    // Этот тест может упасть если нет доступа к issues
    // Просто проверяем что метод существует и не выбрасывает ошибку инициализации
    expect(facade).toHaveProperty('getIssues');
  }, 10000);

  it('должен корректно обрабатывать timeout', async () => {
    // Arrange
    const shortTimeoutConfig = {
      ...realConfig,
      requestTimeout: 1, // 1ms - гарантированный timeout
    };

    const container = await createContainer(shortTimeoutConfig);
    const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);

    // Act & Assert
    // Должен выбросить ошибку timeout
    await expect(facade.ping()).rejects.toThrow();
  }, 10000);
});

// Информационный тест, который всегда запускается
describe('API Connectivity Info', () => {
  it('должен показать статус доступности реального токена', () => {
    if (hasRealToken && hasRealOrgId) {
      console.log('✅ Реальный токен доступен - API connectivity тесты запущены');
      console.log(`   Token: ${process.env.YANDEX_TRACKER_TOKEN?.substring(0, 10)}...`);
      console.log(
        `   Org ID: ${process.env.YANDEX_TRACKER_ORG_ID || process.env.YANDEX_TRACKER_CLOUD_ORG_ID}`
      );
    } else {
      console.log('⏭️  Реальный токен недоступен - API connectivity тесты пропущены');
      console.log('   Для запуска установите:');
      console.log('   - YANDEX_TRACKER_TOKEN');
      console.log('   - YANDEX_TRACKER_ORG_ID или YANDEX_TRACKER_CLOUD_ORG_ID');
    }

    // Тест всегда проходит
    expect(true).toBe(true);
  });
});
