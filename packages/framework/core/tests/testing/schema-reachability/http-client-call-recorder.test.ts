/**
 * Тесты `createHttpClientCallRecorder()` (пакет 7.1.E плана модернизации
 * MCP 2026-07-28).
 */

import { describe, it, expect } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import { createHttpClientCallRecorder } from '../../../src/testing/schema-reachability/http-client-call-recorder.js';

describe('createHttpClientCallRecorder', () => {
  it('накапливает сериализованные аргументы вызовов всех 6 методов IHttpClient', async () => {
    const httpClient = new MockHttpClient();
    const recorder = createHttpClientCallRecorder(httpClient);

    await httpClient.get('/v3/issues/TEST-1');
    await httpClient.post('/v3/issues', { summary: 'probe_summary' });
    await httpClient.patch('/v3/issues/TEST-1', { assignee: 'probe_assignee' });
    await httpClient.delete('/v3/issues/TEST-1');
    await httpClient.getWithResponse('/v3/queues');
    await httpClient.postWithResponse('/v3/issues/_search', { filter: 'probe_filter' });

    const haystack = recorder.haystack();
    expect(haystack).toContain('/v3/issues/TEST-1');
    expect(haystack).toContain('probe_summary');
    expect(haystack).toContain('probe_assignee');
    expect(haystack).toContain('/v3/queues');
    expect(haystack).toContain('probe_filter');
  });

  it('calls() отдаёт структурированный список вызовов с именем метода, в порядке выполнения (для отбора целевого запроса)', async () => {
    const httpClient = new MockHttpClient();
    const recorder = createHttpClientCallRecorder(httpClient);

    await httpClient.get('/v3/issues/TEST-1');
    await httpClient.post('/v3/issues', { summary: 'probe_summary' });
    await httpClient.patch('/v3/issues/TEST-1', { assignee: 'probe_assignee' });
    await httpClient.delete('/v3/issues/TEST-1');
    await httpClient.getWithResponse('/v3/queues');
    await httpClient.postWithResponse('/v3/issues/_search', { filter: 'probe_filter' });

    const calls = recorder.calls();
    expect(calls.map((c) => c.method)).toEqual([
      'get',
      'post',
      'patch',
      'delete',
      'getWithResponse',
      'postWithResponse',
    ]);
    expect(calls[0]?.serialized).toContain('/v3/issues/TEST-1');
    expect(calls[5]?.serialized).toContain('probe_filter');
  });

  it('возвращает вызывающему коду глубокий stub, а не бросает на доступе к вложенным полям ответа', async () => {
    const httpClient = new MockHttpClient();
    createHttpClientCallRecorder(httpClient);

    const response = (await httpClient.get('/v3/issues/TEST-1')) as Record<string, unknown>;
    // Реальная операция может читать глубоко вложенные поля результата —
    // deep stub не должен бросать на этом (в отличие от `{}`).
    expect(() => {
      const nested = response['data'] as Record<string, unknown>;
      void (nested['deeply'] as Record<string, unknown>)['nested'];
    }).not.toThrow();
  });

  it('clear() обнуляет накопленные вызовы', async () => {
    const httpClient = new MockHttpClient();
    const recorder = createHttpClientCallRecorder(httpClient);

    await httpClient.get('/v3/issues/TEST-1');
    expect(recorder.haystack()).toContain('TEST-1');
    expect(recorder.calls()).toHaveLength(1);

    recorder.clear();
    expect(recorder.haystack()).toBe('');
    expect(recorder.calls()).toHaveLength(0);
  });

  it('restore() возвращает httpClient к оригинальному поведению (реальный ответ MockHttpClient)', async () => {
    const httpClient = new MockHttpClient();
    httpClient.setResponse('GET', '/v3/queues', { id: 'real-response' });
    const recorder = createHttpClientCallRecorder(httpClient);

    recorder.restore();

    const response = await httpClient.get('/v3/queues');
    expect(response).toEqual({ id: 'real-response' });
  });
});
