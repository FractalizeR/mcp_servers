/**
 * Что рубеж проверяет в ТЕЛЕ запроса независимо от того, вспомнил ли автор правила
 * про конкретное поле: ссылку на живого человека — по всему телу на любой глубине,
 * состав тела сущности организации — по белому списку ключей.
 *
 * Раунд 2 расширенного ревью (2026-08-25) нашёл третий подряд пропущенный набор
 * полей-ссылок (`fields.*` Entity API, `assignee` ключевого результата,
 * `assignee`/`summonees` задачи, `lead` компонента, `values.*` массовых операций).
 * Тесты закрывают не эти поля, а способ: чёрный список заменён обходом тела и
 * белым списком ключей.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decideRequest } from '#live_scope';
import type { ScopeContext } from '#live_scope';
import {
  SANDBOX_ISSUE,
  SANDBOX_QUEUE,
  SANDBOX_COMPONENT,
  SANDBOX_LOCAL_FIELD,
  RUN_PREFIX,
  RUN_OWNER,
  DISPOSABLE_QUEUE,
  SANDBOX_BOARD,
  SANDBOX_SPRINT,
  SANDBOX_GLOBAL_FIELD,
  SANDBOX_FILTER,
  SANDBOX_ENTITY_TYPE,
  SANDBOX_ENTITY_ID,
} from './known-mutating-requests.js';
import { createRunContext } from './run-fixture.js';

const FOREIGN_PERSON = 'someone-else';

let workDir: string;
let context: ScopeContext;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-body-'));
  context = createRunContext(join(workDir, 'journal.jsonl'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function decide(method: string, path: string, data?: unknown): ReturnType<typeof decideRequest> {
  return decideRequest({ method, url: path, data }, context);
}

const ENTITY_PATH = `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}`;

describe('пункт 1: ссылка на человека ищется по всему телу, а не в перечне полей', () => {
  const foreignBodies: readonly (readonly [string, string, string, unknown])[] = [
    ['assignee задачи', 'patch', `/v3/issues/${SANDBOX_ISSUE}`, { assignee: FOREIGN_PERSON }],
    [
      'summonees комментария',
      'post',
      `/v3/issues/${SANDBOX_ISSUE}/comments`,
      { text: 'x', summonees: [FOREIGN_PERSON] },
    ],
    [
      'assignee элемента чек-листа',
      'post',
      `/v3/issues/${SANDBOX_ISSUE}/checklistItems`,
      { text: 'x', assignee: FOREIGN_PERSON },
    ],
    [
      'lead компонента',
      'post',
      '/v3/components',
      { name: 'c', queue: SANDBOX_QUEUE, lead: FOREIGN_PERSON },
    ],
    [
      'lead компонента на правке',
      'patch',
      `/v3/components/${SANDBOX_COMPONENT}`,
      { lead: FOREIGN_PERSON },
    ],
    [
      'values.assignee массовой операции',
      'post',
      '/v3/bulkchange/_update',
      { issues: [SANDBOX_ISSUE], values: { assignee: FOREIGN_PERSON } },
    ],
  ];

  foreignBodies.forEach(([title, method, path, body]) => {
    it(`${title}: чужой человек отклоняется`, () => {
      const decision = decide(method, path, body);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain(FOREIGN_PERSON);
    });
  });

  it('тот же набор полей на владельце прогона проходит', () => {
    const decisions = foreignBodies.map(([, method, path, body]) =>
      decide(method, path, JSON.parse(JSON.stringify(body).replaceAll(FOREIGN_PERSON, RUN_OWNER)))
    );
    decisions.forEach((decision) => {
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });

  it('чужой человек отклоняется НА ГЛУБИНЕ — внутри массива внутри объекта', () => {
    // `assignee` ключевого результата цели: тело — { fields: { keyResultItems: [ {...} ] } }.
    // Проверка верхнего уровня такого человека не увидела бы вовсе.
    const decision = decide('patch', ENTITY_PATH, {
      fields: {
        keyResultItems: [
          { type: 'binary', text: 'первый', assignee: RUN_OWNER },
          { type: 'binary', text: 'второй', assignee: FOREIGN_PERSON },
        ],
      },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
    expect(decision.reason).toContain('keyResultItems');
  });

  it('та же глубина на владельце прогона проходит', () => {
    const decision = decide('patch', ENTITY_PATH, {
      fields: { keyResultItems: [{ type: 'binary', text: 'kr', assignee: RUN_OWNER }] },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('незаданный владелец прогона отклоняет любое тело со ссылкой на человека', () => {
    const noOwner: ScopeContext = { ...context, runOwner: undefined };
    const decision = decideRequest(
      { method: 'patch', url: `/v3/issues/${SANDBOX_ISSUE}`, data: { assignee: RUN_OWNER } },
      noOwner
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('YANDEX_TRACKER_LIVE_SCOPE_RUN_OWNER');
    expect(decision.reason).not.toContain('не описан ни одним правилом');
  });

  it('поисковый запрос под видом POST человеком в теле не ограничивается', () => {
    // `assignee` в теле поиска — фильтр, а не назначение: запрет сломал бы чтение.
    const decision = decide('post', '/v3/issues/_search', {
      filter: { assignee: FOREIGN_PERSON },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });
});

describe('пункт 2: тело сущности организации разрешается по белому списку ключей', () => {
  const knownKey: readonly (readonly [string, string, string, unknown])[] = [
    ['доска', 'patch', `/v3/boards/${SANDBOX_BOARD}`, { orderBy: 'rank' }],
    ['колонка доски', 'patch', `/v3/boards/${SANDBOX_BOARD}/columns/c1`, { limit: 5 }],
    ['спринт', 'patch', `/v3/sprints/${SANDBOX_SPRINT}`, { startDate: '2026-01-01' }],
    ['глобальное поле', 'patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { suggest: true }],
    ['фильтр', 'patch', `/v3/filters/${SANDBOX_FILTER}`, { query: 'Queue: TEST' }],
    ['очередь', 'patch', `/v3/queues/${DISPOSABLE_QUEUE}`, { defaultType: 'task' }],
    ['запись Entity API', 'patch', ENTITY_PATH, { fields: { weight: 3 } }],
  ];

  knownKey.forEach(([title, method, path, body]) => {
    it(`${title}: известный ключ проходит`, () => {
      const decision = decide(method, path, body);
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });

  const unknownKey: readonly (readonly [string, string, string, unknown, string])[] = [
    ['доска', 'patch', `/v3/boards/${SANDBOX_BOARD}`, { sprints: [1] }, 'sprints'],
    ['колонка доски', 'patch', `/v3/boards/${SANDBOX_BOARD}/columns/c1`, { board: 'x' }, 'board'],
    ['спринт', 'patch', `/v3/sprints/${SANDBOX_SPRINT}`, { entityStatus: 'x' }, 'entityStatus'],
    ['глобальное поле', 'patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { queue: 'PROD' }, 'queue'],
    ['фильтр', 'patch', `/v3/filters/${SANDBOX_FILTER}`, { permissions: { x: 1 } }, 'permissions'],
    ['очередь', 'patch', `/v3/queues/${DISPOSABLE_QUEUE}`, { workflows: {} }, 'workflows'],
    ['запись Entity API', 'patch', ENTITY_PATH, { fields: { teamAccess: true } }, 'teamAccess'],
    ['запись Entity API (верхний уровень)', 'patch', ENTITY_PATH, { links: [1] }, 'links'],
  ];

  unknownKey.forEach(([title, method, path, body, key]) => {
    it(`${title}: неизвестный ключ ${key} отклоняется с его именем`, () => {
      const decision = decide(method, path, body);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain(key);
      expect(decision.reason).not.toContain('не описан ни одним правилом');
    });
  });

  it('разрешение, вид субъекта и действие правки доступов очереди тоже перечислены', () => {
    const unknownPermission = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      'super-admin': { users: { add: [RUN_OWNER] } },
    });
    const unknownSubjectKind = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { teams: { add: [RUN_OWNER] } },
    });
    const unknownAction = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { users: { grantAll: [RUN_OWNER] } },
    });
    expect(unknownPermission.allowed).toBe(false);
    expect(unknownPermission.reason).toContain('super-admin');
    expect(unknownSubjectKind.allowed).toBe(false);
    expect(unknownSubjectKind.reason).toContain('teams');
    expect(unknownAction.allowed).toBe(false);
    expect(unknownAction.reason).toContain('grantAll');
  });

  it('обёртка {add}/{remove} доступов очереди распознаётся гейтом людей на любом теле', () => {
    // `personRefs` обязана распаковывать обёртку `{ add: [...] }`/`{ remove: [...] }`,
    // иначе глобальный обход тела (`live-scope.guard.ts`, до правил семейства)
    // отклонил бы ЛЮБОЕ новое тело `manage_queue_access` как «ссылка на человека
    // не распознана» — доказано чтением `personRefs`, а не наблюдением.
    const foreign = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { users: { remove: [FOREIGN_PERSON] } },
    });
    const owner = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { users: { remove: [RUN_OWNER] } },
    });
    expect(foreign.allowed).toBe(false);
    expect(foreign.reason).toContain(FOREIGN_PERSON);
    expect(owner.allowed, owner.reason).toBe(true);
  });

  it('объект с ключом add и ПОСТОРОННИМ ключом — не обёртка, рубеж fail-closed', () => {
    // Ревью 2026-08-26: `{ add: [владелец], id: чужой }` раньше проходил — код
    // распаковывал только `add`/`remove` и молча игнорировал соседний `id`.
    // Форма не распознана целиком — это отказ, а не разрешение по известной части.
    const decision = decide('patch', `/v3/issues/${SANDBOX_ISSUE}`, {
      assignee: { add: [RUN_OWNER], id: FOREIGN_PERSON },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('законная обёртка {add: [владелец]} без посторонних ключей по-прежнему проходит', () => {
    const decision = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { users: { add: [RUN_OWNER] } },
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('обёртка {add: [чужой]} без посторонних ключей по-прежнему отклоняется', () => {
    const decision = decide('patch', `/v3/queues/${DISPOSABLE_QUEUE}/permissions`, {
      write: { users: { add: [FOREIGN_PERSON] } },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });
});

describe('пункт 2а: пользовательское поле — только системное либо созданное прогоном', () => {
  // Гейт людей узнаёт человека по ИМЕНИ поля, а семантику поля в Трекере задаёт
  // ТИП: поле типа `user` с произвольным именем назначает живого сотрудника и
  // мимо перечня имён проходит незамеченным (ревью 2026-08-25, раунд 3).
  const FOREIGN_FIELD = 'ownerOfTheCompany';

  const systemKey: readonly (readonly [string, string, string, unknown])[] = [
    ['создание задачи', 'post', '/v3/issues', { queue: SANDBOX_QUEUE, summary: 's', unique: 'u' }],
    ['правка задачи', 'patch', `/v3/issues/${SANDBOX_ISSUE}`, { summary: 's', priority: 'normal' }],
    [
      'переход задачи',
      'post',
      `/v3/issues/${SANDBOX_ISSUE}/transitions/fixed/_execute`,
      { comment: 'c', resolution: 'fixed' },
    ],
    [
      'массовое обновление',
      'post',
      '/v3/bulkchange/_update',
      { issues: [SANDBOX_ISSUE], values: { tags: { add: ['x'] }, end: '2026-01-01' } },
    ],
    [
      'массовый перенос',
      'post',
      '/v3/bulkchange/_move',
      { issues: [SANDBOX_ISSUE], queue: SANDBOX_QUEUE, values: { priority: 'normal' } },
    ],
    [
      'массовый переход',
      'post',
      '/v3/bulkchange/_transition',
      { issues: [SANDBOX_ISSUE], transition: 'close', values: { resolution: 'fixed' } },
    ],
  ];

  systemKey.forEach(([title, method, path, body]) => {
    it(`${title}: системный ключ проходит`, () => {
      const decision = decide(method, path, body);
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });

  const ownFields = [SANDBOX_GLOBAL_FIELD, SANDBOX_LOCAL_FIELD];

  ownFields.forEach((field) => {
    it(`поле ${field}, созданное прогоном, проходит в теле задачи и в values`, () => {
      const issue = decide('patch', `/v3/issues/${SANDBOX_ISSUE}`, { [field]: 'x' });
      const bulk = decide('post', '/v3/bulkchange/_update', {
        issues: [SANDBOX_ISSUE],
        values: { [field]: 'x' },
      });
      expect(issue.allowed, issue.reason).toBe(true);
      expect(bulk.allowed, bulk.reason).toBe(true);
    });
  });

  const unknownField: readonly (readonly [string, string, string, unknown])[] = [
    [
      'создание задачи',
      'post',
      '/v3/issues',
      { queue: SANDBOX_QUEUE, summary: 's', [FOREIGN_FIELD]: FOREIGN_PERSON },
    ],
    ['правка задачи', 'patch', `/v3/issues/${SANDBOX_ISSUE}`, { [FOREIGN_FIELD]: FOREIGN_PERSON }],
    [
      'переход задачи',
      'post',
      `/v3/issues/${SANDBOX_ISSUE}/transitions/fixed/_execute`,
      { [FOREIGN_FIELD]: FOREIGN_PERSON },
    ],
    [
      'массовое обновление',
      'post',
      '/v3/bulkchange/_update',
      { issues: [SANDBOX_ISSUE], values: { [FOREIGN_FIELD]: FOREIGN_PERSON } },
    ],
    [
      'массовый перенос',
      'post',
      '/v3/bulkchange/_move',
      {
        issues: [SANDBOX_ISSUE],
        queue: SANDBOX_QUEUE,
        values: { [FOREIGN_FIELD]: FOREIGN_PERSON },
      },
    ],
    [
      'массовый переход',
      'post',
      '/v3/bulkchange/_transition',
      { issues: [SANDBOX_ISSUE], transition: 'close', values: { [FOREIGN_FIELD]: FOREIGN_PERSON } },
    ],
  ];

  unknownField.forEach(([title, method, path, body]) => {
    it(`${title}: неизвестный ключ отклоняется с его названием`, () => {
      const decision = decide(method, path, body);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain(FOREIGN_FIELD);
      expect(decision.reason).toContain('не создано этим прогоном');
      expect(decision.reason).not.toContain('не описан ни одним правилом');
    });
  });

  it('поле, созданное прогоном, но с чужим человеком в значении, всё равно отклоняется', () => {
    // Проверка состава ключей не отменяет гейта людей: `assignee` системный, и
    // человек в нём проверяется по-прежнему.
    const decision = decide('patch', `/v3/issues/${SANDBOX_ISSUE}`, {
      [SANDBOX_GLOBAL_FIELD]: 'x',
      assignee: FOREIGN_PERSON,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain(FOREIGN_PERSON);
  });

  it('values массовой операции нераспознанной формы отклоняется', () => {
    const decision = decide('post', '/v3/bulkchange/_update', {
      issues: [SANDBOX_ISSUE],
      values: 'все поля',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('values');
  });

  it('вложенный ресурс задачи под проверку состава не попадает: своих полей у него нет', () => {
    // Тело комментария закрыто своим DTO, `text` в перечень полей задачи не входит.
    const decision = decide('post', `/v3/issues/${SANDBOX_ISSUE}/comments`, { text: 'x' });
    expect(decision.allowed, decision.reason).toBe(true);
  });
});

describe('пункт 3: правка не снимает префикс с имени своей сущности', () => {
  const renames: readonly (readonly [string, string, unknown])[] = [
    ['доска', `/v3/boards/${SANDBOX_BOARD}`, { name: 'renamed' }],
    ['спринт', `/v3/sprints/${SANDBOX_SPRINT}`, { name: 'renamed' }],
    ['глобальное поле', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { name: 'renamed' }],
    ['фильтр', `/v3/filters/${SANDBOX_FILTER}`, { name: 'renamed' }],
    ['очередь', `/v3/queues/${DISPOSABLE_QUEUE}`, { name: 'renamed' }],
    ['запись Entity API', ENTITY_PATH, { fields: { summary: 'renamed' } }],
  ];

  renames.forEach(([title, path, body]) => {
    it(`${title}: имя без префикса отклоняется`, () => {
      const decision = decide('patch', path, body);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('префикс');
    });
  });

  it('имя с префиксом на правке проходит', () => {
    const decision = decide('patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, {
      name: `${RUN_PREFIX}-field-renamed`,
    });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('тело без имени правку имени не затрагивает', () => {
    const decision = decide('patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { suggest: true });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('локализованное имя обязано нести префикс в каждом языке и на правке', () => {
    const decision = decide('patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, {
      name: { ru: 'Отпуск', en: `${RUN_PREFIX}-vacation` },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('префикс');
  });
});

describe('пункт 4: дети одноразовой очереди принадлежат области прогона', () => {
  it('компонент в одноразовой очереди прогона создаётся', () => {
    const decision = decide('post', '/v3/components', { name: 'c', queue: DISPOSABLE_QUEUE });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('локальное поле в одноразовой очереди прогона создаётся', () => {
    const decision = decide('post', `/v3/queues/${DISPOSABLE_QUEUE}/localFields`, { id: 'f' });
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('локальное поле прогона правится в одноразовой очереди', () => {
    const decision = decide(
      'patch',
      `/v3/queues/${DISPOSABLE_QUEUE}/localFields/${SANDBOX_LOCAL_FIELD}`,
      { category: 'c' }
    );
    expect(decision.allowed, decision.reason).toBe(true);
  });

  it('очередь вне области прогона детей не получает', () => {
    const component = decide('post', '/v3/components', { name: 'c', queue: 'PROD' });
    const localField = decide('post', '/v3/queues/PROD/localFields', { id: 'f' });
    expect(component.allowed).toBe(false);
    expect(component.reason).toContain('вне области прогона');
    expect(localField.allowed).toBe(false);
    expect(localField.reason).toContain('вне области прогона');
  });
});

describe('пункт 6: заякорено и правило задачи, и тип записи Entity API', () => {
  it('неизвестный вложенный ресурс своей задачи отклоняется', () => {
    const decision = decide('post', `/v3/issues/${SANDBOX_ISSUE}/_someNewThing`);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('_someNewThing');
  });

  it('известные вложенные ресурсы своей задачи по-прежнему проходят', () => {
    // Правило намеренно матчит вложенные пути: `/comments/7`, `/transitions/.../_execute`.
    const nested = [
      `/v3/issues/${SANDBOX_ISSUE}/comments/7`,
      `/v3/issues/${SANDBOX_ISSUE}/transitions/fixed/_execute`,
      `/v3/issues/${SANDBOX_ISSUE}/checklistItems/3`,
      `/v3/issues/${SANDBOX_ISSUE}/worklog/5`,
      `/v3/issues/${SANDBOX_ISSUE}/attachments/9`,
      `/v3/issues/${SANDBOX_ISSUE}/links/42`,
    ];
    nested.forEach((path) => {
      const decision = decide('delete', path);
      expect(decision.allowed, `${path}: ${decision.reason}`).toBe(true);
    });
  });

  it('неизвестный тип записи Entity API падает в fail-closed', () => {
    const decision = decide('post', '/v3/entities/roadmap', {
      fields: { summary: `${RUN_PREFIX}-x` },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('не описан ни одним правилом');
  });
});

describe('пункт 7: кодированная точка в пути отвергается так же, как кодированный разделитель', () => {
  const encoded = [
    `/v3/issues/${SANDBOX_ISSUE}/%2e%2e/%2e%2e/projects/11`,
    `/v3/issues/${SANDBOX_ISSUE}/%252e%252e/projects/11`,
    `/v3/issues/${SANDBOX_ISSUE}/..%2f..%2fprojects%2f11`,
    '/v3/projects/%2e%2e',
  ];

  encoded.forEach((path) => {
    it(`отклоняет ${path}`, () => {
      const decision = decide('delete', path);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('кодирован');
    });
  });

  it('строка запроса кодирование сохраняет: ограничение касается только пути', () => {
    const decision = decide('post', `/v3/issues/${SANDBOX_ISSUE}/attachments?filename=%D0%B0.png`);
    expect(decision.allowed, decision.reason).toBe(true);
  });
});
