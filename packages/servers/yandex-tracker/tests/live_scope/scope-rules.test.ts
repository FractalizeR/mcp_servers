/**
 * Решения рубежа области действия по каждому мутирующему запросу Трекера.
 *
 * Негативные кейсы здесь не украшение: белый список выглядит работающим ровно до
 * первого нарушения, и без проверки отказов его дефект неотличим от его отсутствия.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decideRequest } from '#live_scope';
import { RunJournal } from '#live_scope';
import type { ScopeContext } from '#live_scope';
import {
  KNOWN_MUTATING_REQUESTS,
  SEARCH_REQUESTS,
  SANDBOX_ISSUE,
  SANDBOX_QUEUE,
  SANDBOX_COMPONENT,
  SANDBOX_LOCAL_FIELD,
} from './known-mutating-requests.js';

const RUN_ID = 'run-under-test';

let workDir: string;
let context: ScopeContext;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-'));
  const journal = new RunJournal(join(workDir, 'journal.jsonl'), RUN_ID);
  journal.register('issue', SANDBOX_ISSUE);
  journal.register('component', SANDBOX_COMPONENT);
  journal.register('queueLocalField', SANDBOX_LOCAL_FIELD);
  context = { sandboxQueue: SANDBOX_QUEUE, journal };
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function decide(method: string, path: string, data?: unknown): ReturnType<typeof decideRequest> {
  return decideRequest({ method, url: path, data }, context);
}

describe('Область действия живого прогона', () => {
  describe('перечисленные запросы инструментов', () => {
    [...KNOWN_MUTATING_REQUESTS, ...SEARCH_REQUESTS].forEach((request) => {
      it(`${request.tool}: ${request.method.toUpperCase()} ${request.path} — ${request.expectation}`, () => {
        const decision = decide(request.method, request.path, request.body);
        expect(decision.allowed, decision.reason).toBe(
          request.expectation === 'allowed-in-sandbox'
        );
        // Отказ обязан прийти от правила, знающего причину. Без этой проверки
        // таблица оставалась бы зелёной и при полностью неработающих правилах:
        // fail-closed отклонил бы каждый запрос, и «denied» совпало бы случайно.
        expect(decision.reason).not.toContain('не описан ни одним правилом');
      });
    });
  });

  describe('чужая область действия отклоняется', () => {
    it('мутация задачи в чужой очереди', () => {
      const decision = decide('patch', '/v3/issues/PROD-1');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('вне песочной очереди');
    });

    it('мутация задачи песочницы, созданной не этим прогоном', () => {
      // Очередь TEST общая: в ней лежат чужие задачи и задачи прошлых прогонов.
      const decision = decide('delete', `/v3/issues/${SANDBOX_QUEUE}-999/comments/1`);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не создана этим прогоном');
    });

    it('создание задачи в чужой очереди', () => {
      const decision = decide('post', '/v3/issues', { queue: 'PROD', summary: 'x' });
      expect(decision.allowed).toBe(false);
    });

    it('связь, второй конец которой вне песочницы', () => {
      // Связь двусторонняя: она появится и в чужой задаче, хотя путь внутри TEST.
      const decision = decide('post', `/v3/issues/${SANDBOX_ISSUE}/links`, {
        relationship: 'relates',
        issue: 'PROD-7',
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('PROD-7');
    });

    it('массовая операция, где хотя бы один ключ вне журнала', () => {
      const decision = decide('post', '/v2/bulkchange/_update', {
        issues: [SANDBOX_ISSUE, `${SANDBOX_QUEUE}-999`],
        values: {},
      });
      expect(decision.allowed).toBe(false);
    });

    it('массовая операция без явного списка ключей', () => {
      const decision = decide('post', '/v2/bulkchange/_update', {
        query: 'Queue: TEST',
        values: {},
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('без явного списка ключей');
    });

    it('перенос задач прогона за пределы песочницы', () => {
      const decision = decide('post', '/v2/bulkchange/_move', {
        issues: [SANDBOX_ISSUE],
        queue: 'PROD',
      });
      expect(decision.allowed).toBe(false);
    });

    it('правка компонента, созданного не этим прогоном', () => {
      const decision = decide('delete', '/v2/components/foreign-component');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не создан этим прогоном');
    });

    it('компонент в чужой очереди', () => {
      const decision = decide('post', '/v2/queues/PROD/components');
      expect(decision.allowed).toBe(false);
    });

    it('правка локального поля, созданного не этим прогоном', () => {
      // Очередь TEST общая: её поля мог завести кто-то другой.
      const decision = decide('patch', `/v3/queues/${SANDBOX_QUEUE}/localFields/foreignField`);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не создано этим прогоном');
    });
  });

  describe('путь, адресующий не то, что показывает', () => {
    // Найдено ревью: axios канонизирует путь ПОСЛЕ интерцептора, поэтому
    // `/v3/issues/TEST-1/../../v2/projects/11` доходил до правил как путь к задаче
    // прогона, а до сети — как путь к чужому проекту.
    const traversals = [
      `/v3/issues/${SANDBOX_ISSUE}/../../v2/projects/11`,
      `/v3/issues/${SANDBOX_ISSUE}/..%2F..%2Fprojects%2F11`,
      `/v2/components/${SANDBOX_COMPONENT}/../../projects/1`,
      `/v3/issues/${SANDBOX_ISSUE}/./comments`,
      `/v3/issues/${SANDBOX_ISSUE}//comments`,
      `/v3/issues/${SANDBOX_ISSUE}\\..\\projects`,
    ];

    traversals.forEach((path) => {
      it(`отклоняет ${path}`, () => {
        expect(decide('delete', path).allowed).toBe(false);
      });
    });

    it('ключ задачи должен занимать сегмент целиком', () => {
      // `TEST-1extra` — не задача прогона, хотя начинается с её ключа.
      expect(decide('delete', `/v3/issues/${SANDBOX_ISSUE}extra`).allowed).toBe(false);
    });
  });

  describe('умолчания', () => {
    it('неописанный путь отклоняется, а не пропускается', () => {
      // Fail-closed: новый инструмент, про область действия которого никто не думал,
      // должен быть замечен отказом, а не по испорченным данным.
      const decision = decide('post', '/v3/something-new/42');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не описан ни одним правилом');
    });

    it('чтение не ограничивается областью действия', () => {
      expect(decide('get', '/v3/issues/PROD-1').allowed).toBe(true);
      expect(decide('get', '/v2/projects/11').allowed).toBe(true);
    });
  });
});
