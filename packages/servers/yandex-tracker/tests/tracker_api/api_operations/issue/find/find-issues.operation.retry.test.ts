/**
 * Тесты retry-поверхности `_search` (пакет 1.1.E).
 *
 * `FindIssuesOperation` — единственный читающий POST в трёх серверах (см.
 * отчёт пакета 1.1.E). Пакет 1.1.C сделал POST по умолчанию неповторяемым на
 * 5xx/сеть/таймаут (безопасно для мутирующих запросов), но `_search` не имеет
 * побочных эффектов — повтор для него безопасен и важен для отказоустойчивости.
 *
 * В отличие от `find-issues.operation.test.ts` (использует `MockHttpClient`,
 * который НЕ воспроизводит реальный retry — просто отдаёт сконфигурированный
 * ответ), здесь используется настоящий `AxiosHttpClient` + настоящая
 * `ExponentialBackoffStrategy` поверх замоканного axios instance — это
 * единственный способ доказать, что запрос ФАКТИЧЕСКИ повторяется транспортом,
 * а не просто что операция передала нужный флаг.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import {
  AxiosHttpClient,
  ExponentialBackoffStrategy,
  type HttpConfig,
} from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

function createMockAxiosInstance() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(() => 0) },
      response: { use: vi.fn(() => 0) },
    },
  };
}

describe('FindIssuesOperation — retry поверхность читающего POST (пакет 1.1.E)', () => {
  let mockAxiosInstance: ReturnType<typeof createMockAxiosInstance>;
  let operation: FindIssuesOperation;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAxiosInstance = createMockAxiosInstance();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

    const config: HttpConfig = {
      baseURL: 'https://api.tracker.yandex.net',
      timeout: 30000,
      token: 'test-token',
      orgId: 'test-org-id',
    };
    // Малые задержки (baseDelayMs=1) — чтобы тест был быстрым; maxRetries=2.
    const realStrategy = new ExponentialBackoffStrategy(2, 1, 5);
    const realHttpClient = new AxiosHttpClient(config, mockLoggerStub(), realStrategy);

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = mockLoggerStub();

    operation = new FindIssuesOperation(realHttpClient, mockCacheManager, mockLogger);
  });

  function mockLoggerStub(): Logger {
    return {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
  }

  it('DoD: find_issues (_search) на 504 повторяется — читающий POST безопасен для retry', async () => {
    const error504 = { statusCode: 504, message: 'Gateway Timeout' };
    mockAxiosInstance.post.mockRejectedValue(error504);

    await expect(operation.execute({ query: 'status: open' })).rejects.toBeDefined();

    // Первоначальная попытка + 2 retry (maxRetries=2) — как у GET, потому что
    // `_search` объявлен идемпотентным (idempotencyDeclared: true) в операции.
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
  });

  it('POST на 429 повторяется (как и любой другой), даже если бы idempotencyDeclared не было', async () => {
    const error429 = { statusCode: 429, message: 'Too Many Requests', retryAfter: 0 };
    mockAxiosInstance.post.mockRejectedValue(error429);

    await expect(operation.execute({ query: 'status: open' })).rejects.toBeDefined();

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
  });
});
