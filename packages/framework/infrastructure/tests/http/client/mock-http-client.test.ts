/**
 * Unit тесты для MockHttpClient (заголовки + очередь страниц)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';

describe('MockHttpClient', () => {
  let client: MockHttpClient;

  beforeEach(() => {
    client = new MockHttpClient();
  });

  it('get возвращает данные, заданные через setResponse', async () => {
    client.setResponse('GET', '/x', { a: 1 });
    await expect(client.get('/x')).resolves.toEqual({ a: 1 });
  });

  it('reject, если ответ не сконфигурирован', async () => {
    await expect(client.get('/missing')).rejects.toThrow(/No mock response/);
  });

  it('getWithResponse возвращает данные и нормализованные заголовки', async () => {
    client.setResponse('GET', '/x', [1, 2], { 'X-Total-Count': '2' });
    const res = await client.getWithResponse('/x');
    expect(res.data).toEqual([1, 2]);
    expect(res.headers['x-total-count']).toBe('2');
  });

  it('одиночный setResponse «залипает» (возвращается на повторные вызовы)', async () => {
    client.setResponse('GET', '/x', { v: 1 });
    await client.get('/x');
    await expect(client.get('/x')).resolves.toEqual({ v: 1 });
  });

  it('setResponseQueue отдаёт страницы по порядку (FIFO), последняя залипает', async () => {
    client.setResponseQueue('GET', '/list', [
      { data: ['p1'], headers: { link: '<u>; rel="next"' } },
      { data: ['p2'], headers: {} },
    ]);

    const first = await client.getWithResponse('/list');
    expect(first.data).toEqual(['p1']);
    expect(first.headers['link']).toBe('<u>; rel="next"');

    const second = await client.getWithResponse('/list');
    expect(second.data).toEqual(['p2']);

    // Последняя страница залипает
    const third = await client.getWithResponse('/list');
    expect(third.data).toEqual(['p2']);
  });

  it('postWithResponse работает на том же пути с разным телом (для _search)', async () => {
    client.setResponseQueue('POST', '/v3/issues/_search', [
      { data: ['a'], headers: { 'x-total-pages': '2' } },
      { data: ['b'], headers: { 'x-total-pages': '2' } },
    ]);

    const p1 = await client.postWithResponse('/v3/issues/_search', { page: 1 });
    const p2 = await client.postWithResponse('/v3/issues/_search', { page: 2 });
    expect(p1.data).toEqual(['a']);
    expect(p2.data).toEqual(['b']);
  });
});
