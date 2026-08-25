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

const RUN_ID = 'run-under-test';

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
  return new LiveScopeGuard({ sandboxQueue: 'TEST', journal: new RunJournal(journalPath, RUN_ID) });
}

/** Журнал в паре со своим рубежом — для тестов регистрации, читающих журнал напрямую. */
function createGuardWithJournal(): { guard: LiveScopeGuard; journal: RunJournal } {
  const journal = new RunJournal(journalPath, RUN_ID);
  return { guard: new LiveScopeGuard({ sandboxQueue: 'TEST', journal }), journal };
}

describe('LiveScopeGuard', () => {
  it('отклоняет запрос вне области действия с названной причиной', () => {
    const guard = createGuard();

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v3/projects/11', data: undefined })
    ).toThrow(ScopeViolationError);
    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v3/projects/11', data: undefined })
    ).toThrow(/проект 11 не принадлежит этому прогону/);
  });

  it('путь версии v2, снятой миграцией 4.1, отклоняется как неизвестный', () => {
    // Правила организации написаны под /v3/: путей v2 в коде не осталось.
    // Fail-closed обязан сработать и для пути, который клиент больше не отправляет.
    const guard = createGuard();

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v2/projects/11', data: undefined })
    ).toThrow(/не описан ни одним правилом/);
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
    const create = {
      method: 'post',
      url: '/v3/components',
      data: { name: 'c', queue: 'TEST' },
    };

    guard.observeResponse({ request: create, status: 201, data: { id: 555, name: 'c' } });

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v3/components/555', data: undefined })
    ).not.toThrow();
  });

  it('созданное регистрируется и при ином регистре метода в ответе', () => {
    // Инвариант «рубеж не зависит от аккуратности вызывающего» держится в обеих
    // точках входа: «POST» мимо детектора оставил бы созданное без учёта.
    const guard = createGuard();
    const create = {
      method: 'POST',
      url: '/v3/components',
      data: { name: 'c', queue: 'TEST' },
    };

    guard.observeResponse({ request: create, status: 201, data: { id: 557, name: 'c' } });

    expect(() =>
      guard.inspectRequest({ method: 'delete', url: '/v3/components/557', data: undefined })
    ).not.toThrow();
  });

  it('снятый маршрут создания компонента журнал не пополняет', () => {
    // `POST /v3/queues/{q}/components` в API нет: детектор на несуществующем пути
    // маскировал бы регресс — правка «своего» компонента прошла бы по чужому id.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/queues/TEST/components', data: { name: 'c' } },
      status: 201,
      data: { id: 556 },
    });

    expect(journal.list()).toHaveLength(0);
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

  it('задача, созданная прогоном, доступна и по ключу, и по 24-hex идентификатору', () => {
    // API принимает обе формы адресации. Записать только одну значит отклонить
    // собственный законный запрос, стоит инструменту выбрать другую.
    const guard = createGuard();
    const create = { method: 'post', url: '/v3/issues', data: { queue: 'TEST' } };

    guard.observeResponse({
      request: create,
      status: 201,
      data: { key: 'TEST-100', id: '0123456789abcdef01234567' },
    });

    expect(() =>
      guard.inspectRequest({ method: 'patch', url: '/v3/issues/TEST-100', data: {} })
    ).not.toThrow();
    expect(() =>
      guard.inspectRequest({
        method: 'patch',
        url: '/v3/issues/0123456789abcdef01234567',
        data: {},
      })
    ).not.toThrow();
  });

  it('чужая задача по 24-hex идентификатору отклоняется', () => {
    // Форма записи не должна работать как обход: по id очередь не определить,
    // значит решает журнал.
    const guard = createGuard();

    expect(() =>
      guard.inspectRequest({
        method: 'delete',
        url: '/v3/issues/ffffffffffffffffffffffff/comments/1',
        data: undefined,
      })
    ).toThrow(ScopeViolationError);
  });

  it('ответ на чужой запрос журнал не пополняет', () => {
    const guard = createGuard();

    guard.observeResponse({
      request: { method: 'post', url: '/v2/projects', data: {} },
      status: 201,
      data: { id: 'p1' },
    });

    expect(new RunJournal(journalPath, RUN_ID).list()).toHaveLength(0);
  });
});

describe('Регистрация созданного уровня организации', () => {
  // Один тест на род — этап 5.1 п.А: по каждому роду в журнал кладутся поля из
  // таблицы плана, иначе рубеж отклонит собственный законный запрос прогона,
  // стоит инструменту адресовать сущность формой, которая не была записана.

  it('проект регистрируется и по id, и по key', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/projects', data: { name: 'run-1-project' } },
      status: 201,
      data: { id: 10, key: 'PRJ' },
    });

    expect(journal.has('project', '10')).toBe(true);
    expect(journal.has('project', 'PRJ')).toBe(true);
  });

  it('доска регистрируется по id с маршрута создания liveBoards', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/liveBoards/', data: { name: 'run-1-board' } },
      status: 201,
      data: { id: 20 },
    });

    expect(journal.has('board', '20')).toBe(true);
  });

  it('устаревший POST /v3/boards журнал не пополняет', () => {
    // Маршрут молча игнорирует тело: доска, заведённая им, прогону не принадлежит.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/boards', data: { name: 'run-1-board' } },
      status: 201,
      data: { id: 21 },
    });

    expect(journal.list()).toHaveLength(0);
  });

  it('колонка доски (подпуть /v3/boards/{b}/columns) родом board не регистрируется', () => {
    // Право на колонку даёт запись о доске (план, раздел «Журнал») — отдельного
    // рода нет, и общий детектор доски не должен ловить её подпуть.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/boards/20/columns', data: { name: 'col' } },
      status: 201,
      data: { id: 1 },
    });

    expect(journal.list()).toHaveLength(0);
  });

  it('спринт регистрируется по id', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/sprints', data: { name: 'run-1-sprint' } },
      status: 201,
      data: { id: 30 },
    });

    expect(journal.has('sprint', '30')).toBe(true);
  });

  it('глобальное поле регистрируется и по id, и по ключу', () => {
    // Ключом поле стоит в теле задачи (`customFields`) и в `values` массовой
    // операции: записи одного id не хватило бы проверке пользовательских полей.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/fields', data: { name: 'run-1-field' } },
      status: 201,
      data: { id: 'customField123', key: 'runField' },
    });

    expect(journal.has('globalField', 'customField123')).toBe(true);
    expect(journal.has('globalField', 'runField')).toBe(true);
  });

  it('локальное поле очереди регистрируется и по глобальному id, и по короткому ключу', () => {
    // PATCH локального поля идёт по короткому `key` (`myField`), а не по
    // глобальному `id` (`<hex>--myField`) — записи одного id не хватало на
    // собственную же правку.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/queues/TEST/localFields', data: { id: 'myField' } },
      status: 201,
      data: { id: 'abcdef--myField', key: 'myField' },
    });

    expect(journal.has('queueLocalField', 'abcdef--myField')).toBe(true);
    expect(journal.has('queueLocalField', 'myField')).toBe(true);
  });

  it('фильтр регистрируется по id', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/filters/', data: { name: 'run-1-filter' } },
      status: 201,
      data: { id: 40 },
    });

    expect(journal.has('filter', '40')).toBe(true);
  });

  it('очередь регистрируется и по id, и по key', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/queues/', data: { key: 'DISP', name: 'run-1-queue' } },
      status: 201,
      data: { id: 50, key: 'DISP' },
    });

    expect(journal.has('queue', '50')).toBe(true);
    expect(journal.has('queue', 'DISP')).toBe(true);
  });

  it('сущность Entity API регистрируется с префиксом типа: id и shortId', () => {
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/entities/goal', data: { fields: { summary: 'run-1' } } },
      status: 201,
      data: { id: 'abc123', shortId: 42 },
    });

    expect(journal.has('entity', 'goal/abc123')).toBe(true);
    expect(journal.has('entity', 'goal/42')).toBe(true);
  });

  it('сущность Entity API другого типа с тем же id — другая запись журнала', () => {
    // Составной ключ держит рода раздельными: одного `id` без типа мало.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: {
        method: 'post',
        url: '/v3/entities/portfolio',
        data: { fields: { summary: 'run-1' } },
      },
      status: 201,
      data: { id: 'abc123' },
    });

    expect(journal.has('entity', 'portfolio/abc123')).toBe(true);
    expect(journal.has('entity', 'goal/abc123')).toBe(false);
  });

  it('сущность Entity API без shortId в ответе регистрируется только по id', () => {
    // Первая живая проба этапа 5.2 сверяет фактический набор полей (план,
    // раздел «Детектор созданного»); пока shortId не пришёл, лишней записи быть не должно.
    const { guard, journal } = createGuardWithJournal();

    guard.observeResponse({
      request: { method: 'post', url: '/v3/entities/goal', data: { fields: { summary: 'run-1' } } },
      status: 201,
      data: { id: 'abc123' },
    });

    expect(journal.list()).toEqual([{ kind: 'entity', id: 'goal/abc123' }]);
  });
});

describe('Включение рубежа', () => {
  it('без переменной очереди рубеж не создаётся', () => {
    expect(createLiveScopeGuardFromEnv({})).toBeUndefined();
  });

  it('пишущий прогон без объявленной области отклоняет мутации, но читает', () => {
    // Иначе рубеж — то, что легко забыть включить, а значит снова аккуратность
    // ведущего прогон, а не свойство системы (найдено ревью).
    //
    // Отказ на вызове, а не падение на старте: stdio не доносит stderr сервера,
    // и упавший процесс виден клиенту как «Connection closed» — транспортный сбой
    // вместо причины (проверено вживую).
    const guard = createLiveScopeGuardFromEnv({ MCP_DEV_WRITE_ALLOWED: '1' });

    expect(guard).toBeDefined();
    expect(() =>
      guard?.inspectRequest({ method: 'patch', url: '/v3/issues/TEST-1', data: {} })
    ).toThrow(/область действия не объявлена/i);
    expect(() =>
      guard?.inspectRequest({ method: 'get', url: '/v3/issues/TEST-1', data: undefined })
    ).not.toThrow();
  });

  it('осознанный отказ от рубежа возможен только точным значением', () => {
    const halfHearted = createLiveScopeGuardFromEnv({
      MCP_DEV_WRITE_ALLOWED: '1',
      YANDEX_TRACKER_LIVE_SCOPE_OFF: 'true',
    });
    expect(halfHearted).toBeDefined();

    expect(
      createLiveScopeGuardFromEnv({
        MCP_DEV_WRITE_ALLOWED: '1',
        YANDEX_TRACKER_LIVE_SCOPE_OFF: 'i-am-writing-to-production',
      })
    ).toBeUndefined();
  });

  it('читающий прогон рубежа не требует', () => {
    // mcp-dev без --dangerously-allow-write маркер не ставит: чтение безопасно.
    expect(createLiveScopeGuardFromEnv({ MCP_DEV_WRITE_ALLOWED: undefined })).toBeUndefined();
  });

  it('очередь без журнала — отказ на старте, а не половина рубежа', () => {
    expect(() => createLiveScopeGuardFromEnv({ YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST' })).toThrow(
      /журнал прогона обязателен/i
    );
  });

  it('очередь без метки прогона — отказ на старте: чужой журнал считался бы своим', () => {
    expect(() =>
      createLiveScopeGuardFromEnv({
        YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST',
        YANDEX_TRACKER_LIVE_SCOPE_JOURNAL: journalPath,
      })
    ).toThrow(/YANDEX_TRACKER_LIVE_SCOPE_RUN_ID/);
  });

  it('обе переменные заданы — рубеж работает', () => {
    const guard = createLiveScopeGuardFromEnv({
      YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST',
      YANDEX_TRACKER_LIVE_SCOPE_JOURNAL: journalPath,
      YANDEX_TRACKER_LIVE_SCOPE_RUN_ID: RUN_ID,
    });

    expect(guard).toBeDefined();
    expect(() => guard?.inspectRequest({ method: 'post', url: '/v3/fields', data: {} })).toThrow(
      ScopeViolationError
    );
  });

  describe('переменные окружения этапа 5.1: префикс прогона и одноразовая очередь', () => {
    const RUN_PREFIX_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_RUN_PREFIX';
    const DISPOSABLE_QUEUE_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_DISPOSABLE_QUEUE';
    const RUN_OWNER_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_RUN_OWNER';
    // Функция, а не константа: `journalPath` заполняется в `beforeEach`, который
    // выполняется позже тела `describe` — константа захватила бы `undefined`.
    const baseEnv = (): NodeJS.ProcessEnv => ({
      YANDEX_TRACKER_LIVE_SCOPE_QUEUE: 'TEST',
      YANDEX_TRACKER_LIVE_SCOPE_JOURNAL: journalPath,
      YANDEX_TRACKER_LIVE_SCOPE_RUN_ID: RUN_ID,
    });

    it('незаданная одноразовая очередь отклоняет создание очереди, называя переменную', () => {
      const guard = createLiveScopeGuardFromEnv({ ...baseEnv(), [RUN_PREFIX_VAR]: 'run-1' });

      expect(() =>
        guard?.inspectRequest({ method: 'post', url: '/v3/queues', data: { key: 'DISP' } })
      ).toThrow(new RegExp(DISPOSABLE_QUEUE_VAR));
    });

    it('не заданы — создание проекта отклоняется отсутствием префикса', () => {
      const guard = createLiveScopeGuardFromEnv(baseEnv());

      expect(() =>
        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
      ).toThrow(new RegExp(RUN_PREFIX_VAR));
    });

    it('заданы — прокидываются в контекст и разрешают легальный запрос', () => {
      const guard = createLiveScopeGuardFromEnv({
        ...baseEnv(),
        [RUN_PREFIX_VAR]: 'run-1',
        [DISPOSABLE_QUEUE_VAR]: 'DISP',
      });

      expect(() =>
        guard?.inspectRequest({
          method: 'post',
          url: '/v3/queues',
          data: { key: 'DISP', name: 'run-1-queue' },
        })
      ).not.toThrow();
    });

    it('пустая строка равнозначна незаданной', () => {
      const guard = createLiveScopeGuardFromEnv({
        ...baseEnv(),
        [RUN_PREFIX_VAR]: '',
        [DISPOSABLE_QUEUE_VAR]: '',
      });

      expect(() =>
        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
      ).toThrow(new RegExp(RUN_PREFIX_VAR));
    });

    it('строка из пробелов равнозначна незаданной', () => {
      const guard = createLiveScopeGuardFromEnv({
        ...baseEnv(),
        [RUN_PREFIX_VAR]: '   ',
        [DISPOSABLE_QUEUE_VAR]: '   ',
      });

      expect(() =>
        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
      ).toThrow(new RegExp(RUN_PREFIX_VAR));
    });

    // Шов «переменная окружения → runOwner» проверялся только на контексте,
    // собранном руками: опечатка в имени переменной не была бы замечена ничем.
    describe('владелец прогона', () => {
      const withOwner = (value: string | undefined): NodeJS.ProcessEnv => ({
        ...baseEnv(),
        [RUN_PREFIX_VAR]: 'run-1',
        [DISPOSABLE_QUEUE_VAR]: 'DISP',
        ...(value === undefined ? {} : { [RUN_OWNER_VAR]: value }),
      });
      const createQueue = (
        data: Record<string, unknown>
      ): ((guard: LiveScopeGuard | undefined) => void) => {
        return (guard) => guard?.inspectRequest({ method: 'post', url: '/v3/queues', data });
      };
      const queueBody = (lead: string): Record<string, unknown> => ({
        key: 'DISP',
        name: 'run-1-queue',
        lead,
      });

      it('заданная разрешает ссылку на себя и отклоняет чужого человека', () => {
        const guard = createLiveScopeGuardFromEnv(withOwner('owner-login'));

        expect(() => createQueue(queueBody('owner-login'))(guard)).not.toThrow();
        expect(() => createQueue(queueBody('someone-else'))(guard)).toThrow(/someone-else/);
      });

      it('незаданная отклоняет любое тело со ссылкой на человека, называя переменную', () => {
        const guard = createLiveScopeGuardFromEnv(withOwner(undefined));

        expect(() => createQueue(queueBody('owner-login'))(guard)).toThrow(
          new RegExp(RUN_OWNER_VAR)
        );
      });

      it('пустая строка и строка из пробелов равнозначны незаданной', () => {
        ['', '   '].forEach((value) => {
          const guard = createLiveScopeGuardFromEnv(withOwner(value));
          expect(() => createQueue(queueBody('owner-login'))(guard)).toThrow(
            new RegExp(RUN_OWNER_VAR)
          );
        });
      });
    });
  });
});
