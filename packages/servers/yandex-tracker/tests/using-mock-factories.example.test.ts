// tests/examples/using-mock-factories.example.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
} from './helpers/mock-factories.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';

/**
 * ПРИМЕР: Как использовать mock factories в новых тестах
 * Этот файл показывает правильные паттерны для Фаз 1-3
 */
describe('EXAMPLE: Using Mock Factories', () => {
  let mockLogger: Logger;
  // @ts-expect-error - пример использования, используется только для демонстрации паттерна
  let _mockHttpClient: IHttpClient;
  let mockFacade: Partial<YandexTrackerFacade>;

  beforeEach(() => {
    // ✅ ПРАВИЛЬНО: Используй factories
    mockLogger = createMockLogger();
    _mockHttpClient = createMockHttpClient();
    mockFacade = createMockFacade();
  });

  it('пример использования mockLogger', () => {
    mockLogger.info('test message');

    expect(mockLogger.info).toHaveBeenCalledWith('test message');
  });

  it('пример использования mockFacade', async () => {
    // Setup mock behavior
    mockFacade.getIssues = vi.fn().mockResolvedValue([{ key: 'TEST-1', summary: 'Test' }]);

    // Use mock
    const result = await mockFacade.getIssues!(['TEST-1']);

    // Verify
    expect(result).toHaveLength(1);
    expect(mockFacade.getIssues).toHaveBeenCalledWith(['TEST-1']);
  });
});
