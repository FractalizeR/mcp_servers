// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

/**
 * Создать полностью типизированный mock для Logger
 */
export function createMockLogger(): Logger {
  const childLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => childLogger),
  };

  return childLogger;
}

/**
 * Создать mock для HttpClient
 */
export function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  } as unknown as HttpClient;
}

/**
 * Создать partial mock для YandexTrackerFacade
 * Используй это для unit тестов tools
 */
export function createMockFacade(): Partial<YandexTrackerFacade> {
  return {
    getIssues: vi.fn(),
    findIssues: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    transitionIssue: vi.fn(),
    getIssueChangelog: vi.fn(),
    getIssueTransitions: vi.fn(),
  };
}

/**
 * Helper для создания partial mock с явным типом
 */
export function createPartialMock<T>(partial: Partial<T>): T {
  return partial as T;
}
