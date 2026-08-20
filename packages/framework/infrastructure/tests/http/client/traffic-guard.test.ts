/**
 * Надзор за исходящим трафиком (`HttpTrafficGuard`).
 *
 * Тесты идут на НАСТОЯЩЕМ axios с подменённым адаптером, а не на `vi.mock('axios')`:
 * утверждение «запрос отклонён до сети» проверяемо только тем, что адаптер —
 * последнее звено перед отправкой — не был вызван ни разу. На моке axios такой
 * проверки не существует.
 */

import { describe, it, expect, vi } from 'vitest';
import { AxiosHttpClient } from '@fractalizer/mcp-infrastructure/http/client/axios-http-client.js';
import type { HttpConfig } from '@fractalizer/mcp-infrastructure/http/client/http-config.interface.js';
import type {
  HttpTrafficGuard,
  OutgoingRequest,
  ObservedResponse,
} from '@fractalizer/mcp-infrastructure/http/client/http-traffic-guard.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { ExponentialBackoffStrategy } from '@fractalizer/mcp-infrastructure/http/retry/exponential-backoff.strategy.js';
import { ScopeViolationError } from '@fractalizer/mcp-infrastructure/http/error/scope-violation.error.js';
import type { AxiosInstance } from 'axios';

function createMockLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;
}

interface Harness {
  client: AxiosHttpClient;
  /** Сколько раз запрос дошёл до отправки. */
  adapterCalls: () => number;
  inspected: OutgoingRequest[];
  observed: ObservedResponse[];
}

/**
 * @param guardBehaviour — что делает `inspectRequest`; бросок означает отказ
 * @param withGuard — false воспроизводит продовую конфигурацию (guard не задан)
 */
function createHarness(
  guardBehaviour: (request: OutgoingRequest) => void = () => {},
  withGuard = true
): Harness {
  const inspected: OutgoingRequest[] = [];
  const observed: ObservedResponse[] = [];
  let adapterCalls = 0;

  const guard: HttpTrafficGuard = {
    inspectRequest: (request) => {
      inspected.push(request);
      guardBehaviour(request);
    },
    observeResponse: (response) => {
      observed.push(response);
    },
  };

  const config: HttpConfig = {
    baseURL: 'https://api.example.test',
    timeout: 1000,
    token: 'token',
    ...(withGuard && { trafficGuard: guard }),
  };

  // maxRetries=3: отказ guard не должен превращаться в четыре похода в сеть.
  const client = new AxiosHttpClient(
    config,
    createMockLogger(),
    new ExponentialBackoffStrategy(3, 1, 2)
  );

  const axiosInstance = client.getAxiosInstance() as AxiosInstance;
  axiosInstance.defaults.adapter = async (requestConfig) => {
    adapterCalls += 1;
    return {
      data: { id: 'created-id' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: requestConfig,
    };
  };

  return { client, adapterCalls: () => adapterCalls, inspected, observed };
}

describe('HttpTrafficGuard', () => {
  it('пропускает запрос, когда guard не возражает', async () => {
    const h = createHarness();

    await expect(h.client.post('/v3/issues', { queue: 'TEST' })).resolves.toEqual({
      id: 'created-id',
    });
    expect(h.adapterCalls()).toBe(1);
  });

  it('видит метод, путь и тело запроса', async () => {
    const h = createHarness();

    await h.client.patch('/v3/issues/TEST-1?version=7', { summary: 'x' });

    expect(h.inspected).toHaveLength(1);
    expect(h.inspected[0]?.method).toBe('patch');
    expect(h.inspected[0]?.url).toBe('/v3/issues/TEST-1?version=7');
    // Тело приходит в guard ДО сериализации axios — объектом, а не JSON-строкой.
    expect(h.inspected[0]?.data).toEqual({ summary: 'x' });
  });

  it('отклонённый запрос не уходит в сеть', async () => {
    const h = createHarness(() => {
      throw new ScopeViolationError('вне области действия прогона');
    });

    await expect(h.client.delete('/v2/boards/foreign-board')).rejects.toThrow(ScopeViolationError);
    expect(h.adapterCalls()).toBe(0);
  });

  it('отказ guard не повторяется retry-механизмом', async () => {
    // Поймано этим тестом при разработке: обычная Error из interceptor уходила в
    // ErrorMapper, получала статус «сетевая» и повторялась — четыре вызова guard
    // вместо одного. ScopeViolationError объявляет себя неповторяемой.
    const h = createHarness(() => {
      throw new ScopeViolationError('отказ');
    });

    await expect(h.client.get('/v3/issues/TEST-1')).rejects.toThrow('отказ');
    expect(h.adapterCalls()).toBe(0);
    expect(h.inspected).toHaveLength(1);
  });

  it('наблюдает ответ на разрешённый запрос — источник идентификаторов созданного', async () => {
    const h = createHarness();

    await h.client.post('/v3/issues', { queue: 'TEST' });

    expect(h.observed).toHaveLength(1);
    expect(h.observed[0]?.status).toBe(200);
    expect(h.observed[0]?.data).toEqual({ id: 'created-id' });
    expect(h.observed[0]?.request.url).toBe('/v3/issues');
  });

  it('перехватывает и запросы, отправленные через getAxiosInstance() в обход IHttpClient', async () => {
    // Ключевой кейс: upload_attachment отправляет multipart напрямую через axios
    // instance. Рубеж на уровне методов IHttpClient его бы не увидел.
    const h = createHarness(() => {
      throw new ScopeViolationError('отказ');
    });
    const instance = h.client.getAxiosInstance() as AxiosInstance;

    await expect(instance.post('/v2/issues/FOREIGN-1/attachments', new FormData())).rejects.toThrow(
      'отказ'
    );
    expect(h.adapterCalls()).toBe(0);
  });

  it('без guard в конфигурации поведение не меняется', async () => {
    const h = createHarness(() => {
      throw new Error('guard не должен вызываться');
    }, false);

    await expect(h.client.get('/v3/myself')).resolves.toEqual({ id: 'created-id' });
    expect(h.adapterCalls()).toBe(1);
    expect(h.inspected).toHaveLength(0);
  });
});
