/**
 * Регрессионный тест: мутирующий POST не повторяется на 504 (пакет 1.1.C,
 * пакет 1.1.E проверяет, что регрессия не вернулась при добивании retry-
 * поверхности для читающих POST).
 *
 * `CreateBoardOperation` создаёт ресурс (POST /v3/boards) без ключа
 * идемпотентности — прямой аналог классов дефектов из 1.1.C (create_issue до
 * фикса, create_component, create_field, ...). Используется реальный
 * `AxiosHttpClient` + реальная `ExponentialBackoffStrategy` поверх
 * замоканного axios instance, чтобы проверять фактическое поведение
 * транспорта, а не только то, что операция ничего не передала лишнего.
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
import { CreateBoardOperation } from '#tracker_api/api_operations/board/create-board.operation.js';

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

describe('CreateBoardOperation — мутирующий POST не повторяется на 504 (регрессия 1.1.C)', () => {
  let mockAxiosInstance: ReturnType<typeof createMockAxiosInstance>;
  let operation: CreateBoardOperation;

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
    const realStrategy = new ExponentialBackoffStrategy(2, 1, 5);
    const logger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
    const realHttpClient = new AxiosHttpClient(config, logger, realStrategy);
    const cacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    operation = new CreateBoardOperation(realHttpClient, cacheManager, logger);
  });

  it('регрессия: create_board на 504 НЕ повторяется (нет idempotencyDeclared)', async () => {
    const error504 = { statusCode: 504, message: 'Gateway Timeout' };
    mockAxiosInstance.post.mockRejectedValue(error504);

    await expect(operation.execute({ name: 'Test Board' })).rejects.toBeDefined();

    // Только первоначальная попытка — повтора не было (повтор создал бы
    // вторую доску на уже, возможно, выполненном сервером запросе).
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
  });
});
