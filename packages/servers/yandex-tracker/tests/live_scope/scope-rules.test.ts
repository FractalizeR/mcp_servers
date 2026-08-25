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
import type { ScopeContext } from '#live_scope';
import {
  KNOWN_MUTATING_REQUESTS,
  SEARCH_REQUESTS,
  SANDBOX_ISSUE,
  SANDBOX_QUEUE,
  SANDBOX_COMPONENT,
  RUN_PREFIX,
  DISPOSABLE_QUEUE,
  SANDBOX_PROJECT_ID,
  SANDBOX_PROJECT_KEY,
  SANDBOX_BOARD,
  SANDBOX_SPRINT,
  SANDBOX_ENTITY_ID,
} from './known-mutating-requests.js';
import { createRunContext } from './run-fixture.js';

let workDir: string;
let context: ScopeContext;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-'));
  context = createRunContext(join(workDir, 'journal.jsonl'));
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

    // Этап 4.1 перевёл bulkchange, components и queues/{q}/components на v3.
    // Проверка тем же набором кейсов на новых путях — попытка, а не декларация:
    // тест, отклоняющий только v2-путь, после переезда операций перестал бы
    // доказывать хоть что-то про реальный трафик.
    it('массовая операция вне журнала отклоняется и на пути v3', () => {
      const decision = decide('post', '/v3/bulkchange/_update', {
        issues: [SANDBOX_ISSUE, `${SANDBOX_QUEUE}-999`],
        values: {},
      });
      expect(decision.allowed).toBe(false);
    });

    it('правка компонента чужого прогона отклоняется и на пути v3', () => {
      const decision = decide('delete', '/v3/components/foreign-component');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не создан этим прогоном');
    });

    it('компонент в чужой очереди отклоняется и на пути v3', () => {
      const decision = decide('post', '/v3/queues/PROD/components');
      expect(decision.allowed).toBe(false);
    });

    it('проекты и глобальные поля остаются вне области действия и на пути v3', () => {
      expect(decide('patch', '/v3/projects/11').allowed).toBe(false);
      expect(decide('patch', '/v3/fields/f1').allowed).toBe(false);
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
      expect(decide('get', '/v3/projects/11').allowed).toBe(true);
    });
  });

  describe('этап 4.1: v3 допускается там же, где допускался v2', () => {
    it('массовая операция по задачам этого прогона проходит на v3', () => {
      const decision = decide('post', '/v3/bulkchange/_update', {
        issues: [SANDBOX_ISSUE],
        values: {},
      });
      expect(decision.allowed, decision.reason).toBe(true);
    });

    it('создание компонента в песочной очереди проходит на v3', () => {
      const decision = decide('post', `/v3/queues/${SANDBOX_QUEUE}/components`);
      expect(decision.allowed, decision.reason).toBe(true);
    });

    it('правка компонента, созданного этим прогоном, проходит на v3', () => {
      const decision = decide('patch', `/v3/components/${SANDBOX_COMPONENT}`);
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });
});

// Сущности организации допускаются по владению прогоном, а не безусловным
// отказом (обзор допуска — `src/live_scope/README.md`).
// Отдельные describe верхнего уровня — а не вложенность в предыдущий блок,
// иначе один общий callback описания вырос бы за max-lines-per-function.
describe('этап 5.1: создание org-сущностей и правка по журналу (условия 1-6)', () => {
  describe('условие 1 — создание без префикса в имени отклоняется', () => {
    it('проект', () => {
      const decision = decide('post', '/v3/projects', {
        name: 'no-prefix-project',
        queueIds: [],
        teamUserIds: [],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('префикс');
    });

    it('доска', () => {
      const decision = decide('post', '/v3/boards', { name: 'no-prefix-board' });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('префикс');
    });

    it('глобальное поле', () => {
      const decision = decide('post', '/v3/fields', { name: 'no-prefix-field' });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('префикс');
    });

    it('фильтр', () => {
      const decision = decide('post', '/v3/filters', { name: 'no-prefix-filter' });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('префикс');
    });
  });

  it('условие 2 — правка сущности вне журнала отклоняется, даже если имя несёт префикс', () => {
    const decision = decide('patch', '/v3/projects/unknown-project', {
      name: `${RUN_PREFIX}-project`,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('не принадлежит этому прогону');
  });

  it('условие 3 — колонка на доске вне журнала отклоняется', () => {
    const decision = decide('post', '/v3/boards/unknown-board/columns', {
      name: 'col',
      statuses: ['open'],
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('колонка доски unknown-board не принадлежит этому прогону');
  });

  describe('условие 4 — спринт с board вне журнала отклоняется; форма ссылки строкой и объектом', () => {
    it('board строкой', () => {
      const decision = decide('post', '/v3/sprints', {
        name: `${RUN_PREFIX}-sprint`,
        board: 'unknown-board',
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не принадлежащую этому прогону');
    });

    it('board объектом {id}', () => {
      const decision = decide('post', '/v3/sprints', {
        name: `${RUN_PREFIX}-sprint`,
        board: { id: 'unknown-board' },
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('не принадлежащую этому прогону');
    });

    it('board объектом {id} своей доски — допуск', () => {
      // Доказывает, что refOf распознаёт объектную форму, а не только строку.
      const decision = decide('post', '/v3/sprints', {
        name: `${RUN_PREFIX}-sprint`,
        board: { id: SANDBOX_BOARD },
      });
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });

  it('условие 5 — _start/_archive спринта вне журнала отклоняется', () => {
    // Ветка, которую синтетический энумератор не увидел: он попал только на _start.
    const start = decide('post', '/v3/sprints/unknown-sprint/_start');
    const archive = decide('post', '/v3/sprints/unknown-sprint/_archive');
    expect(start.allowed).toBe(false);
    expect(archive.allowed).toBe(false);
    expect(start.reason).toContain('не принадлежит этому прогону');
    expect(archive.reason).toContain('не принадлежит этому прогону');
  });

  it('условие 6 — запись Entity API того же id, но другого type, отклоняется', () => {
    const decision = decide('patch', `/v3/entities/portfolio/${SANDBOX_ENTITY_ID}`, {
      fields: { summary: 'x' },
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('не принадлежит этому прогону');
  });
});

describe('этап 5.1: ссылки в теле, тело без имени, префикс/якорение (условия 7-13)', () => {
  describe('условие 7 — проект со ссылкой за пределами прогона в теле отклоняется', () => {
    it('queueIds содержит постороннюю очередь при создании', () => {
      const decision = decide('post', '/v3/projects', {
        name: `${RUN_PREFIX}-project`,
        queueIds: ['PROD'],
        teamUserIds: [],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('queueIds');
    });

    it('непустой teamUserIds при создании', () => {
      const decision = decide('post', '/v3/projects', {
        name: `${RUN_PREFIX}-project`,
        queueIds: [],
        teamUserIds: ['user-1'],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('teamUserIds');
    });

    it('queueIds содержит постороннюю очередь при правке', () => {
      const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
        queueIds: ['PROD'],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('queueIds');
    });

    it('непустой teamUserIds при правке', () => {
      const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
        teamUserIds: ['user-1'],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('teamUserIds');
    });
  });

  it('условие 8 — доска с queue вне песочницы отклоняется', () => {
    const decision = decide('post', '/v3/boards', {
      name: `${RUN_PREFIX}-board`,
      queue: 'PROD',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('queue');
  });

  describe('условие 9 — создание очереди по ключу и переменной окружения', () => {
    it('ключ, отличный от disposableQueue, отклоняется', () => {
      const decision = decide('post', '/v3/queues', {
        key: 'OTHER',
        name: `${RUN_PREFIX}-queue`,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('одноразовой очередью');
    });

    it('незаданная disposableQueue отклоняет любой ключ', () => {
      const noDisposable: ScopeContext = { ...context, disposableQueue: undefined };
      const decision = decideRequest(
        { method: 'post', url: '/v3/queues', data: { key: DISPOSABLE_QUEUE, name: 'x' } },
        noDisposable
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('YANDEX_TRACKER_LIVE_SCOPE_DISPOSABLE_QUEUE');
    });
  });

  describe('условие 10 — тело без распознанного имени отклоняется', () => {
    it('пустое тело', () => {
      expect(decide('post', '/v3/projects').allowed).toBe(false);
    });

    it('тело строкой', () => {
      expect(decide('post', '/v3/projects', 'not-json-and-not-object').allowed).toBe(false);
    });

    it('тело FormData (multipart, как у upload_attachment)', () => {
      const form = new FormData();
      form.append('name', `${RUN_PREFIX}-project`);
      expect(decide('post', '/v3/projects', form).allowed).toBe(false);
    });
  });

  it('условие 11 — незаданный runPrefix отклоняет создание named-причиной, а не fail-closed', () => {
    const noPrefix: ScopeContext = { ...context, runPrefix: undefined };
    const decision = decideRequest(
      { method: 'post', url: '/v3/projects', data: { name: 'anything' } },
      noPrefix
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('YANDEX_TRACKER_LIVE_SCOPE_RUN_PREFIX');
    expect(decision.reason).not.toContain('не описан ни одним правилом');
  });

  it('условие 12 — своя сущность адресуется и по id, и по key', () => {
    expect(decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`).allowed).toBe(true);
    expect(decide('patch', `/v3/projects/${SANDBOX_PROJECT_KEY}`).allowed).toBe(true);
  });

  describe('условие 13 — bulk _move в одноразовую очередь', () => {
    it('в disposableQueue — допуск', () => {
      const decision = decide('post', '/v3/bulkchange/_move', {
        issues: [SANDBOX_ISSUE],
        queue: DISPOSABLE_QUEUE,
      });
      expect(decision.allowed, decision.reason).toBe(true);
    });

    it('в постороннюю очередь — отказ', () => {
      const decision = decide('post', '/v3/bulkchange/_move', {
        issues: [SANDBOX_ISSUE],
        queue: 'PROD',
      });
      expect(decision.allowed).toBe(false);
    });
  });

  describe('порядок и якорение правил-родителей', () => {
    it('доска: подпуть /columns решается частным правилом, а не родителем', () => {
      // Незаякоренный родитель (`/^\/v3\/boards/`) отвечал бы «доски видны за
      // пределами очереди»; частное правило называет причину через колонку.
      const decision = decide('post', '/v3/boards/unknown-board/columns', {
        name: 'col',
        statuses: ['open'],
      });
      expect(decision.reason).toContain('колонка');
      expect(decision.reason).not.toContain('доски видны за пределами очереди');
    });

    it('спринт: подпуть /_start решается правилом спринта, а не общим отказом', () => {
      const decision = decide('post', `/v3/sprints/${SANDBOX_SPRINT}/_start`);
      expect(decision.allowed, decision.reason).toBe(true);
    });

    it('своя доска правится собственным правилом, не задевая правило колонок', () => {
      const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, {
        name: `${RUN_PREFIX}-board-renamed`,
      });
      expect(decision.allowed, decision.reason).toBe(true);
    });
  });
});
