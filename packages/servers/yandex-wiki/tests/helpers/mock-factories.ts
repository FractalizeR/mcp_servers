// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure';
import type { YandexWikiFacade } from '../../src/wiki_api/facade/yandex-wiki.facade.js';

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
 * Создать mock для CacheManager
 */
export function createMockCacheManager(): CacheManager {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
  } as unknown as CacheManager;
}

/**
 * Создать partial mock для YandexWikiFacade
 * Используй это для unit тестов tools
 */
export function createMockFacade(): Partial<YandexWikiFacade> {
  return {
    getPage: vi.fn(),
    getPageById: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
    clonePage: vi.fn(),
    appendContent: vi.fn(),
    getResources: vi.fn(),
    getGrid: vi.fn(),
    createGrid: vi.fn(),
    updateGrid: vi.fn(),
    deleteGrid: vi.fn(),
    addRows: vi.fn(),
    removeRows: vi.fn(),
    addColumns: vi.fn(),
    removeColumns: vi.fn(),
    updateCells: vi.fn(),
    moveRows: vi.fn(),
    moveColumns: vi.fn(),
    cloneGrid: vi.fn(),
  };
}

/**
 * Helper для создания partial mock с явным типом
 */
export function createPartialMock<T>(partial: Partial<T>): T {
  return partial as T;
}
