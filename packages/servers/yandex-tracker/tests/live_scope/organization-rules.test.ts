/**
 * Что рубеж делает с ТЕЛОМ запроса к сущности организации и где кончается право,
 * данное журналом.
 *
 * Каждый блок закрывает механизм, найденный расширенным ревью 2026-08-25: право
 * «сущность моя» само по себе не позволяет перевесить её на чужого родителя или
 * чужого человека, ключ одноразовой очереди из переменной окружения владения не
 * доказывает, правило-родитель не выдаёт права на неизвестный подпуть, а префикс
 * обязан стоять в каждом языке имени.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decideRequest, RunJournal } from '#live_scope';
import type { ScopeContext } from '#live_scope';
import {
  SANDBOX_ISSUE,
  SANDBOX_QUEUE,
  SANDBOX_COMPONENT,
  RUN_PREFIX,
  RUN_OWNER,
  DISPOSABLE_QUEUE,
  SANDBOX_PROJECT_ID,
  SANDBOX_BOARD,
  SANDBOX_SPRINT,
  SANDBOX_ENTITY_TYPE,
  SANDBOX_ENTITY_ID,
} from './known-mutating-requests.js';
import { createRunContext, RUN_ID } from './run-fixture.js';

const FOREIGN_PERSON = 'someone-else';

let workDir: string;
let context: ScopeContext;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-org-'));
  context = createRunContext(join(workDir, 'journal.jsonl'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function decide(method: string, path: string, data?: unknown): ReturnType<typeof decideRequest> {
  return decideRequest({ method, url: path, data }, context);
}

function decideIn(
  scope: ScopeContext,
  method: string,
  path: string,
  data?: unknown
): ReturnType<typeof decideRequest> {
  return decideRequest({ method, url: path, data }, scope);
}

/** Прогон, у которого одноразовая очередь объявлена, но не создана: журнал пуст. */
function withUncreatedDisposableQueue(): ScopeContext {
  const journal = new RunJournal(join(workDir, 'journal-uncreated.jsonl'), RUN_ID);
  journal.register('issue', SANDBOX_ISSUE);
  journal.register('project', SANDBOX_PROJECT_ID);
  journal.register('board', SANDBOX_BOARD);
  return {
    sandboxQueue: SANDBOX_QUEUE,
    journal,
    runPrefix: RUN_PREFIX,
    disposableQueue: DISPOSABLE_QUEUE,
    runOwner: RUN_OWNER,
  };
}

describe('ссылки в теле проверяются и на правке, а не только на создании', () => {
  it('спринт прогона нельзя перевесить на чужую доску', () => {
    // Спринт, перевешенный на боевую доску, меняет состав спринтов ЧУЖОЙ доски.
    const decision = decide('patch', `/v3/sprints/${SANDBOX_SPRINT}`, { board: 'FOREIGN' });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('не принадлежащую этому прогону');
  });

  it('спринт прогона правится, пока доска остаётся своей', () => {
    const decision = decide('patch', `/v3/sprints/${SANDBOX_SPRINT}`, {
      name: `${RUN_PREFIX}-sprint`,
      board: SANDBOX_BOARD,
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('доску прогона нельзя перепривязать к боевой очереди', () => {
    const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, { queue: 'PROD' });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('queue');
  });

  it('доска прогона правится, пока очередь остаётся песочной', () => {
    const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, { queue: SANDBOX_QUEUE });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('создание спринта без ссылки на доску отклоняется: родитель не распознан', () => {
    const decision = decide('post', '/v3/sprints', { name: `${RUN_PREFIX}-sprint` });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('board');
  });

  it('нераспознанная форма teamUserIds отклоняется так же, как непустая', () => {
    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
      teamUserIds: 'user-1',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('teamUserIds');
  });
});

describe('ссылка на живого человека — только владелец прогона', () => {
  it('lead проекта на чужом человеке отклоняется при создании', () => {
    const decision = decide('post', '/v3/projects', {
      name: `${RUN_PREFIX}-project`,
      lead: FOREIGN_PERSON,
      queueIds: [SANDBOX_QUEUE],
      teamUserIds: [],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('lead проекта на владельце прогона допускается', () => {
    const decision = decide('post', '/v3/projects', {
      name: `${RUN_PREFIX}-project`,
      lead: RUN_OWNER,
      queueIds: [SANDBOX_QUEUE],
      teamUserIds: [],
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('lead проекта на чужом человеке отклоняется и при правке', () => {
    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
      lead: { id: FOREIGN_PERSON },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('lead создаваемой очереди на чужом человеке отклоняется', () => {
    const decision = decide('post', '/v3/queues', {
      key: DISPOSABLE_QUEUE,
      name: `${RUN_PREFIX}-queue`,
      lead: FOREIGN_PERSON,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('правка очереди прогона не назначает ей чужого руководителя', () => {
    const decision = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}`, { lead: FOREIGN_PERSON });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('доступы очереди прогона чужому человеку не выдаются', () => {
    // Форма тела — та, что строит ManageQueueAccessOperation.
    const decision = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      access: { add: [RUN_OWNER, FOREIGN_PERSON] },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('доступы очереди прогона владельцу прогона выдаются', () => {
    const decision = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      access: { add: [RUN_OWNER] },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('доступы чужой очереди отклоняются: песочная очередь прогоном не создавалась', () => {
    // Правка доступов боевой очереди — самая разрушительная мутация Трекера.
    const decision = decide('patch', `/v3/queues/${SANDBOX_QUEUE}/permissions`, {
      access: { add: [RUN_OWNER] },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('доступы очереди');
  });

  it('нераспознанная форма тела доступов отклоняется', () => {
    const decisions = [
      decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`),
      decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {}),
      decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, { access: 'add-everyone' }),
      decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, { access: { add: [{}] } }),
    ];
    decisions.forEach((decision) => {
      expect(decision.allowed, decision.reason).toBe(false);
    });
  });

  it('необъявленный владелец прогона отклоняет любое тело со ссылкой на человека', () => {
    const noOwner: ScopeContext = { ...context, runOwner: undefined };
    const decision = decideIn(noOwner, 'post', '/v3/projects', {
      name: `${RUN_PREFIX}-project`,
      lead: RUN_OWNER,
      queueIds: [],
      teamUserIds: [],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('YANDEX_TRACKER_LIVE_SCOPE_RUN_OWNER');
    expect(decision.reason).not.toContain('не описан ни одним правилом');
  });

  it('тело без ссылки на человека при необъявленном владельце проходит', () => {
    // Прогон уровня песочной очереди людей организации не касается вовсе.
    const noOwner: ScopeContext = { ...context, runOwner: undefined };
    const decision = decideIn(noOwner, 'post', '/v3/filters', { name: `${RUN_PREFIX}-filter` });
    expect(decision.allowed, decision.reason).toBe(true);
  });
});

describe('владение одноразовой очередью доказывает журнал, а не переменная окружения', () => {
  it('проект не ссылается на объявленную, но не созданную одноразовую очередь', () => {
    const decision = decideIn(withUncreatedDisposableQueue(), 'post', '/v3/projects', {
      name: `${RUN_PREFIX}-project`,
      lead: RUN_OWNER,
      queueIds: [DISPOSABLE_QUEUE],
      teamUserIds: [],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('queueIds');
  });

  it('доска не привязывается к объявленной, но не созданной одноразовой очереди', () => {
    const decision = decideIn(withUncreatedDisposableQueue(), 'post', '/v3/boards', {
      name: `${RUN_PREFIX}-board`,
      queue: DISPOSABLE_QUEUE,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('queue');
  });

  it('массовый перенос в объявленную, но не созданную одноразовую очередь отклоняется', () => {
    const decision = decideIn(withUncreatedDisposableQueue(), 'post', '/v3/bulkchange/_move', {
      issues: [SANDBOX_ISSUE],
      queue: DISPOSABLE_QUEUE,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(DISPOSABLE_QUEUE);
  });

  it('созданная одноразовая очередь становится законной целью ссылок', () => {
    const project = decide('post', '/v3/projects', {
      name: `${RUN_PREFIX}-project`,
      lead: RUN_OWNER,
      queueIds: [DISPOSABLE_QUEUE],
      teamUserIds: [],
    });
    const move = decide('post', '/v3/bulkchange/_move', {
      issues: [SANDBOX_ISSUE],
      queue: DISPOSABLE_QUEUE,
    });
    expect(project.allowed, project.reason).toBe(true);
    expect(move.allowed, move.reason).toBe(true);
  });
});

describe('правило-родитель не выдаёт права на неизвестный подпуть', () => {
  const unknownSubpaths: readonly (readonly [string, string])[] = [
    ['patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions/extra`],
    ['patch', `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}/checklistItems/5`],
    ['post', `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}/comments`],
    ['delete', `/v3/components/${SANDBOX_COMPONENT}/extra`],
    ['delete', `/v3/queues/${SANDBOX_QUEUE}/localFields/foreignField/values`],
    ['delete', `/v3/boards/${SANDBOX_BOARD}/columns/c1/extra`],
  ];

  unknownSubpaths.forEach(([method, path]) => {
    it(`${method.toUpperCase()} ${path} падает в fail-closed`, () => {
      const decision = decide(method, path);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не описан ни одним правилом');
    });
  });

  it('метод вне списка правила семейства не проваливается в разрешение', () => {
    // Правило записи Entity API объявлено на patch/delete: put обязан упасть
    // в fail-closed, а не решиться правилом с другим набором методов.
    const decision = decide('put', `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}`, {
      fields: { summary: 'x' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('не описан ни одним правилом');
  });
});

describe('префикс прогона обязателен в каждом языке имени', () => {
  it('локализованное имя с префиксом только в одном языке отклоняется', () => {
    // Остаток ищут поиском по отображаемому имени: русское имя без префикса
    // не найдётся, и сущность останется в организации навсегда.
    const decision = decide('post', '/v3/fields', {
      name: { ru: 'Отпуск', en: `${RUN_PREFIX}-vacation` },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('префикс');
  });

  it('локализованное имя с префиксом во всех языках допускается', () => {
    const decision = decide('post', '/v3/fields', {
      name: { ru: `${RUN_PREFIX}-отпуск`, en: `${RUN_PREFIX}-vacation` },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('пустая строка языком не считается и допуску не мешает', () => {
    const decision = decide('post', '/v3/fields', {
      name: { ru: '', en: `${RUN_PREFIX}-vacation` },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('имя без единого строкового значения отклоняется', () => {
    const decisions = [
      decide('post', '/v3/fields', { name: {} }),
      decide('post', '/v3/fields', { name: { ru: '', en: '' } }),
      decide('post', '/v3/fields', { name: 42 }),
    ];
    decisions.forEach((decision) => {
      expect(decision.allowed, decision.reason).toBe(false);
    });
  });
});
