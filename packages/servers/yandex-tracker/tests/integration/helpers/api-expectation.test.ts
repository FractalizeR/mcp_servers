/**
 * Самопроверка оснастки `ApiExpectationSet` — DoD пакета 2.1.1, пункт 4
 * (`.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`):
 * незаявленный запрос роняет, неслучившийся заявленный роняет, неверная версия роняет,
 * нарушенный порядок роняет.
 *
 * Запросы бьются напрямую по `client.getAxiosInstance()`, в обход MCP tool/HttpClient —
 * это изолирует поведение оснастки от retry-логики `HttpClient`
 * (`retryAttempts: 0` у тестового клиента убирает retry как отдельную переменную,
 * см. шапку `api-expectation.ts` про экспериментально подтверждённую задержку ~7s).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from './mcp-client.js';
import type { TestMCPClient } from './mcp-client.js';
import { ApiExpectationSet } from './api-expectation.js';

/**
 * `client.getAxiosInstance()` — тот же instance, на котором `AxiosHttpClient`
 * навешивает свой response-interceptor (`packages/framework/infrastructure/src/http/
 * client/axios-http-client.ts`): он заворачивает ЛЮБУЮ ошибку (кроме
 * `ScopeViolationError`) в `ApiErrorClass` через `ErrorMapper.mapAxiosError`, теряя
 * исходный класс `HarnessExpectationError`. Поэтому здесь проверяется текст ошибки
 * (переживает обёртку), а не `instanceof`.
 */

describe('ApiExpectationSet — оснастка ожиданий HTTP-запросов', () => {
  let client: TestMCPClient;
  let api: ApiExpectationSet;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent', retryAttempts: 0 });
    api = new ApiExpectationSet(client.getAxiosInstance());
  });

  afterEach(() => {
    api.cleanup();
  });

  it('незаявленный запрос роняет с внятной причиной', async () => {
    await expect(client.getAxiosInstance().get('/v2/boards')).rejects.toThrow(
      /Незаявленный запрос/
    );
  });

  it('заявленный, но не случившийся запрос роняет assertAllExpectationsMet()', () => {
    api.expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' }).reply(200, []);

    expect(() => api.assertAllExpectationsMet()).toThrow(/Не все заявленные запросы/);
  });

  it('apiVersion, не совпадающий с префиксом пути, роняет уже при объявлении', () => {
    expect(() =>
      api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v2' })
    ).toThrow(/не соответствует пути/);
  });

  it('нарушенный порядок роняет: второй заявленный запрос пришёл раньше первого', async () => {
    api.expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' }).reply(200, []);
    api.expectRequest({ method: 'get', path: '/v2/boards/1', apiVersion: 'v2' }).reply(200, {});

    await expect(client.getAxiosInstance().get('/v2/boards/1')).rejects.toThrow(
      /не совпал с ожиданием/
    );
  });

  it('ожидание без .reply() до прихода запроса роняет с понятной причиной', async () => {
    api.expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' });

    await expect(client.getAxiosInstance().get('/v2/boards')).rejects.toThrow(
      /не получило \.reply/
    );
  });

  it('несколько ответов на один и тот же путь отдаются по порядку (страница 1, затем 2)', async () => {
    api
      .expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' })
      .reply(200, [{ id: '1' }]);
    api
      .expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' })
      .reply(200, [{ id: '2' }]);

    const first = await client.getAxiosInstance().get('/v2/boards');
    const second = await client.getAxiosInstance().get('/v2/boards');

    expect(first.data).toEqual([{ id: '1' }]);
    expect(second.data).toEqual([{ id: '2' }]);
    expect(() => api.assertAllExpectationsMet()).not.toThrow();
  });

  it('заголовки ответа доступны вызывающему (нужны для Link rel="next"/rel="seek")', async () => {
    api
      .expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' })
      .reply(200, [], { Link: '<https://api.tracker.yandex.net/v2/boards?page=2>; rel="next"' });

    const response = await client.getAxiosInstance().get('/v2/boards');

    // Bracket-доступ регистрозависим на "сыром" AxiosHeaders (нормализует только
    // через .get(), а не bracket-доступ) — подтверждено экспериментом при написании
    // этого теста: ключ остаётся в исходном регистре, каким его передали в .reply().
    const headers = response.headers as unknown as Record<string, string>;
    expect(String(headers['Link'])).toContain('rel="next"');
  });

  it('незаявленный query роняет: параметр, попавший в запрос молча, не свидетельство', async () => {
    api.expectRequest({ method: 'get', path: '/v2/boards', apiVersion: 'v2' }).reply(200, []);

    await expect(
      client.getAxiosInstance().get('/v2/boards', { params: { localized: false } })
    ).rejects.toThrow(/незаявленный query/);
  });

  it('query из строки пути наблюдается наравне с параметрами axios', async () => {
    api
      .expectRequest({ method: 'get', path: '/v3/entities/goal/G-1', apiVersion: 'v3' })
      .reply(200, {});

    await expect(
      client.getAxiosInstance().get('/v3/entities/goal/G-1?fields=keyResultItems')
    ).rejects.toThrow(/незаявленный query.*fields/s);
  });

  it('заявленный query сверяется по значению, число и строка эквивалентны', async () => {
    api
      .expectRequest({
        method: 'get',
        path: '/v2/projects',
        apiVersion: 'v2',
        query: { perPage: 10 },
      })
      .reply(200, []);

    const response = await client.getAxiosInstance().get('/v2/projects?perPage=10');

    expect(response.status).toBe(200);
  });

  it('несовпавшее тело запроса роняет с описанием расхождения', async () => {
    api
      .expectRequest({
        method: 'post',
        path: '/v2/boards',
        apiVersion: 'v2',
        body: { name: 'Expected' },
      })
      .reply(200, {});

    await expect(client.getAxiosInstance().post('/v2/boards', { name: 'Actual' })).rejects.toThrow(
      /тело запроса не совпало/
    );
  });

  it('attemptedCount считает попытки независимо от исхода (нужно assertNoHttp)', async () => {
    expect(api.attemptedCount).toBe(0);

    await client
      .getAxiosInstance()
      .get('/v2/unmatched')
      .catch(() => undefined);

    expect(api.attemptedCount).toBe(1);
  });
});
