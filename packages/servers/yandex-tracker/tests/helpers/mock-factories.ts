// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { YandexTrackerFacade } from '../../src/tracker_api/facade/yandex-tracker.facade.js';

/**
 * Создать полностью типизированный mock для Logger
 */
export function createMockLogger(): Logger {
  const childLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
    setAlertingTransport: vi.fn(),
    setLevel: vi.fn(),
  } as unknown as Logger;

  // Настроить child чтобы возвращал сам себя
  (childLogger.child as ReturnType<typeof vi.fn>).mockReturnValue(childLogger);

  return childLogger;
}

/**
 * Создать mock для IHttpClient
 */
export function createMockHttpClient(): IHttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  } as unknown as IHttpClient;
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
