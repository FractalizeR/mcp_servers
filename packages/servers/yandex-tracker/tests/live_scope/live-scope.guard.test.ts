/**
 * Рубеж как объект: отказ, пополнение журнала из ответов, переживание журнала
 * между процессами.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScopeViolationError } from '@fractalizer/mcp-infrastructure';
import { LiveScopeGuard, RunJournal, createLiveScopeGuardFromEnv } from '#live_scope';

let workDir: string;
let journalPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-guard-'));
  journalPath = join(workDir, 'journal.jsonl');
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function createGuard(): LiveScopeGuard {
  return new LiveScopeGuard({ sandboxQueue: 'TEST', journal: new RunJournal(journalPath) });
}

describe('LiveScopeGuard', () => {
  it('отклоняет запрос вне области действия с названной причиной', () => {
    const guard = createGuard();

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v2/projects/11', data: undefined })
    ).toThrow(ScopeViolationError);
    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v2/projects/11', data: undefined })
    ).toThrow(/проекты принадлежат организации целиком/);
  });

  it('созданная задача попадает в журнал и становится доступной для правки', () => {
    const guard = createGuard();
    const create = { method: 'post', url: '/v3/issues', data: { queue: 'TEST' } };

    // До создания правка запрещена: задачи в журнале нет.
    expect(() =>
      guard.inspectRequest({ method: 'patch', url: '/v3/issues/TEST-42', data: {} })
    ).toThrow(ScopeViolationError);

    guard.inspectRequest(create);
    guard.observeResponse({ request: create, status: 201, data: { key: 'TEST-42', id: 'x' } });

    expect(() =>
      guard.inspectRequest({ method: 'patch', url: '/v3/issues/TEST-42', data: {} })
    ).not.toThrow();
  });

  it('созданный компонент опознаётся по идентификатору из ответа', () => {
    const guard = createGuard();
    const create = { method: 'post', url: '/v2/queues/TEST/components', data: { name: 'c' } };

    guard.observeResponse({ request: create, status: 201, data: { id: 555, name: 'c' } });

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v2/components/555', data: undefined })
    ).not.toThrow();
  });

  it('журнал переживает перезапуск процесса', () => {
    // Прогон через `tools:call` поднимает сервер заново на каждый вызов: журнал
    // в памяти был бы пуст к моменту уборки.
    const first = createGuard();
    const create = { method: 'post', url: '/v3/issues', data: { queue: 'TEST' } };
    first.observeResponse({ request: create, status: 201, data: { key: 'TEST-77' } });

    const second = createGuard();
    expect(() =>
      second.inspectRequest({
        method: 'delete',
        url: '/v3/issues/TEST-77/comments/1',
        data: undefined,
      })
    ).not.toThrow();
  });

  it('ответ на чужой запрос журнал не пополняет', () => {
    const guard = createGuard();

    guard.observeResponse({
      request: { method: 'post', url: '/v2/projects', data: {} },
      status: 201,
      data: { id: 'p1' },
    });

    expect(new RunJournal(journalPath).list()).toHaveLength(0);
  });
});

describe('Включение рубежа', () => {
  it('без переменной очереди рубеж не создаётся', () => {
    expect(createLiveScopeGuardFromEnv({})).toBeUndefined();
  });

  it('очередь без журнала — отказ на старте, а не половина рубежа', () => {
    expect(() => createLiveScopeGuardFromEnv({ YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST' })).toThrow(
      /журнал прогона обязателен/i
    );
  });

  it('обе переменные заданы — рубеж работает', () => {
    const guard = createLiveScopeGuardFromEnv({
      YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST',
      YANDEX_TRACKER_LIVE_SCOPE_JOURNAL: journalPath,
    });

    expect(guard).toBeDefined();
    expect(() => guard?.inspectRequest({ method: 'post', url: '/v2/fields', data: {} })).toThrow(
      ScopeViolationError
    );
  });
});
