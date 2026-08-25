import { describe, it, expect, vi } from 'vitest';
import type { HttpResponseEnvelope, ResponseHeaders } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator, DEFAULT_MAX_ITEMS } from '#tracker_api/utils/tracker-paginator.util.js';
import { ItemBudget } from '#tracker_api/utils/item-budget.util.js';
import { CursorCodec, CURSOR_TAGS } from '#tracker_api/utils/cursor-codec.util.js';

/** Хелпер: собрать конверт ответа. */
function envelope<T>(data: T[], headers: ResponseHeaders = {}): HttpResponseEnvelope<T[]> {
  return { data, headers };
}

/** Хелпер: заголовок Link с next на относительный путь. */
function linkNext(path: string): ResponseHeaders {
  return { link: `<https://api.tracker.yandex.net${path}>; rel="next"` };
}

/** Хелпер: заголовок Link с next + seek (seekable-эндпоинт). */
function linkNextSeek(path: string): ResponseHeaders {
  return {
    link:
      `<https://api.tracker.yandex.net${path}>; rel="next", ` +
      `<https://api.tracker.yandex.net/v3/queues?{&page}>; rel="seek"`,
  };
}

describe('TrackerPaginator', () => {
  describe('stripHost', () => {
    it('срезает схему и хост у абсолютного URL', () => {
      expect(TrackerPaginator.stripHost('https://api.tracker.yandex.net/v3/issues?page=2')).toBe(
        '/v3/issues?page=2'
      );
    });

    it('оставляет относительный путь как есть', () => {
      expect(TrackerPaginator.stripHost('/v2/issues/X-1/worklog?page=3')).toBe(
        '/v2/issues/X-1/worklog?page=3'
      );
    });

    it('сохраняет запятые в query', () => {
      expect(TrackerPaginator.stripHost('https://host/v3/issues?expand=a,b&page=2')).toBe(
        '/v3/issues?expand=a,b&page=2'
      );
    });

    it('возвращает undefined для пути не из /v2|/v3 (guard)', () => {
      expect(TrackerPaginator.stripHost('https://evil.example/redirect')).toBeUndefined();
      expect(TrackerPaginator.stripHost('/v1/issues')).toBeUndefined();
    });
  });

  describe('buildMeta', () => {
    it('заполняет total/totalPages из X-Total-* при наличии rel="seek"', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {
          ...linkNextSeek('/v3/queues?page=2'),
          'x-total-count': '150',
          'x-total-pages': '3',
        },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        nextUrl: 'https://api.tracker.yandex.net/v3/queues?page=2',
        perPage: 50,
      });

      expect(meta.total).toBe(150);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(true); // есть nextUrl
      expect(meta.fetchedAll).toBe(false);
    });

    it('X-Total-* БЕЗ rel="seek" игнорируются (seek-gating)', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: { 'x-total-count': '150', 'x-total-pages': '3' },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        perPage: 50,
      });

      expect(meta.total).toBeUndefined();
      expect(meta.totalPages).toBeUndefined();
      expect(meta.hasNextPage).toBe(false);
      expect(meta.fetchedAll).toBe(true);
    });

    it('без заголовков не заполняет total/totalPages', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {},
        pagesFetched: 1,
        truncated: false,
        hasError: false,
      });

      expect(meta.total).toBeUndefined();
      expect(meta.totalPages).toBeUndefined();
      expect(meta.hasNextPage).toBe(false);
      expect(meta.fetchedAll).toBe(true);
    });

    it('hasNextPage=true при наличии nextUrl', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {},
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        nextUrl: '/v3/issues?page=2',
      });

      expect(meta.hasNextPage).toBe(true);
      expect(meta.fetchedAll).toBe(false);
      // без tag курсор не кодируется
      expect(meta.nextCursor).toBeUndefined();
    });

    it('hasError ломает fetchedAll даже без next', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {},
        pagesFetched: 2,
        truncated: false,
        hasError: true,
      });

      expect(meta.hasNextPage).toBe(false);
      expect(meta.fetchedAll).toBe(false);
      expect(meta.hasError).toBe(true);
    });

    it('игнорирует нечисловой X-Total-Count (при seek)', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {
          link: '<https://api.tracker.yandex.net/v3/queues?{&page}>; rel="seek"',
          'x-total-count': 'n/a',
        },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
      });

      expect(meta.total).toBeUndefined();
    });
  });

  describe('fetchAllPages', () => {
    it('одна страница без Link — fetchedAll=true', async () => {
      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2, 3]),
        requestNext: vi.fn(),
      });

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.truncated).toBe(false);
    });

    it('обходит N страниц по Link rel=next', async () => {
      const requestNext = vi
        .fn()
        .mockResolvedValueOnce(envelope([3, 4], linkNext('/v3/items?page=3')))
        .mockResolvedValueOnce(envelope([5, 6])); // нет Link — конец

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2], linkNext('/v3/items?page=2')),
        requestNext,
      });

      expect(result.items).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.pagination.pagesFetched).toBe(3);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(requestNext).toHaveBeenCalledWith('/v3/items?page=2');
      expect(requestNext).toHaveBeenCalledWith('/v3/items?page=3');
    });

    it('упор в maxItems — ровно maxItems записей, truncated=true', async () => {
      // 3 страницы по 2 записи; maxItems=4
      const requestNext = vi
        .fn()
        .mockResolvedValueOnce(envelope([3, 4], linkNext('/v3/items?page=3')))
        .mockResolvedValueOnce(envelope([5, 6], linkNext('/v3/items?page=4')));

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2], linkNext('/v3/items?page=2')),
        requestNext,
        maxItems: 4,
      });

      expect(result.items).toEqual([1, 2, 3, 4]);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('упор в maxPages — backstop, truncated=true', async () => {
      const requestNext = vi.fn().mockResolvedValue(envelope([9], linkNext('/v3/items?page=next')));

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([0], linkNext('/v3/items?page=2')),
        requestNext,
        maxItems: 1000,
        maxPages: 3,
      });

      expect(result.pagination.pagesFetched).toBe(3);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('частичный отказ — возвращает собранное, hasError=true, onError вызван', async () => {
      const error = new Error('network down');
      const requestNext = vi
        .fn()
        .mockResolvedValueOnce(envelope([3, 4], linkNext('/v3/items?page=3')))
        .mockRejectedValueOnce(error);
      const onError = vi.fn();

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2], linkNext('/v3/items?page=2')),
        requestNext,
        onError,
      });

      expect(result.items).toEqual([1, 2, 3, 4]); // страницы 1..2 не потеряны
      expect(result.pagination.hasError).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(onError).toHaveBeenCalledWith(error, 2);
    });

    it('пустой первый ответ', async () => {
      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope<number>([]),
        requestNext: vi.fn(),
      });

      expect(result.items).toEqual([]);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('невалидный next (guard) останавливает обход без ошибки', async () => {
      const requestNext = vi.fn();
      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1], {
          link: '<https://evil.example/steal>; rel="next"',
        }),
        requestNext,
      });

      expect(result.items).toEqual([1]);
      expect(requestNext).not.toHaveBeenCalled();
      // next был, но guard его отбросил → обход завершён, не обрезан
      expect(result.pagination.truncated).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('дефолтный maxItems применяется', async () => {
      expect(DEFAULT_MAX_ITEMS).toBe(500);
    });

    it('общий budget ограничивает выдачу и truncated=true', async () => {
      const budget = new ItemBudget(3);
      const requestNext = vi.fn();

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2, 3, 4, 5], linkNext('/v3/items?page=2')),
        requestNext,
        budget,
      });

      // budget=3 режет первую же страницу до 3 записей
      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(budget.remaining).toBe(0);
      // обход остановлен — следующая страница не запрашивалась
      expect(requestNext).not.toHaveBeenCalled();
    });

    it('budget делится между цепочками (вторая получает остаток)', async () => {
      const budget = new ItemBudget(5);

      const first = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2, 3]),
        requestNext: vi.fn(),
        budget,
      });
      const second = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([4, 5, 6, 7]),
        requestNext: vi.fn(),
        budget,
      });

      expect(first.items).toEqual([1, 2, 3]);
      expect(second.items).toEqual([4, 5]); // остаток бюджета = 2
      expect(second.pagination.truncated).toBe(true);
      expect(budget.remaining).toBe(0);
    });
  });

  describe('singlePage', () => {
    it('без Link/X-Total — hasNextPage=false, fetchedAll=true, pagesFetched=1', () => {
      const result = TrackerPaginator.singlePage(envelope([1, 2, 3]), { perPage: 50 });

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.truncated).toBe(false);
      expect(result.pagination.hasError).toBe(false);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.perPage).toBe(50);
      expect(result.pagination.nextCursor).toBeUndefined();
    });

    it('есть Link rel=next — hasNextPage=true, fetchedAll=false (есть ещё данные)', () => {
      const result = TrackerPaginator.singlePage(envelope([1, 2], linkNext('/v3/items?page=2')));

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.truncated).toBe(false);
    });

    it('X-Total-* прокидываются только при rel="seek"', () => {
      const result = TrackerPaginator.singlePage(
        envelope([1, 2], {
          ...linkNextSeek('/v3/queues?page=2'),
          'x-total-count': '42',
          'x-total-pages': '21',
        }),
        { perPage: 2 }
      );

      expect(result.pagination.total).toBe(42);
      expect(result.pagination.totalPages).toBe(21);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('X-Total-* без rel="seek" не прокидываются', () => {
      const result = TrackerPaginator.singlePage(
        envelope([1, 2], { 'x-total-count': '42', 'x-total-pages': '21' }),
        { perPage: 2 }
      );

      expect(result.pagination.total).toBeUndefined();
      expect(result.pagination.totalPages).toBeUndefined();
    });

    it('копирует массив items (не держит ссылку на response.data)', () => {
      const data = [1, 2];
      const result = TrackerPaginator.singlePage(envelope(data));
      expect(result.items).not.toBe(data);
      expect(result.items).toEqual([1, 2]);
    });
  });

  // --- sanity-check hasNextPage (F3): Трекер на курсорных ручках отдаёт
  // Link rel="next" ВСЕГДА, даже когда следующая страница пуста. См. симптом
  // в плане 3.3: get_comments стабильно возвращал count:1, hasNextPage:true. ---
  describe('singlePage sanity-check hasNextPage vs perPage (F3)', () => {
    it('элементов меньше perPage + есть Link → hasNextPage=false, но nextCursor ВСЁ РАВНО присутствует (находка №3)', () => {
      // Находка №3 (MAJOR, внешнее ревью 2026-08): инвариант "nextCursor ⟺
      // hasNextPage" ЗАМЕНЁН на "nextCursor присутствует при реальном Link
      // rel=next, независимо от sanity-эвристики hasNextPage". Раньше этот
      // тест фиксировал старое (ошибочное) поведение — подавление курсора
      // вместе с hasNextPage делало потерю данных необнаружимой, если
      // эвристика perPage-сравнения ошиблась (сервер клампит perPage или
      // отдаёт неполную страницу из-за прав — подтверждено вживую на v2:
      // /issues/{id}/checklistItems; после миграции 4.1 путь на v3, на v3
      // не переснималось). Курсору можно доверять — он от сервера, а не
      // из эвристики.
      const result = TrackerPaginator.singlePage(
        envelope([{ id: 1 }], linkNext('/v3/issues/A-1/comments?id=5&perPage=50')),
        { perPage: 50, tag: CURSOR_TAGS.comments }
      );

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
      expect(
        CursorCodec.decode(result.pagination.nextCursor as string, CURSOR_TAGS.comments).path
      ).toBe('/v3/issues/A-1/comments?id=5&perPage=50');
    });

    it('элементов ровно perPage + есть Link → hasNextPage=true, nextCursor есть', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const result = TrackerPaginator.singlePage(
        envelope(data, linkNext('/v3/issues/A-1/comments?id=50&perPage=50')),
        { perPage: 50, tag: CURSOR_TAGS.comments }
      );

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('truncated=true держит hasNextPage=true независимо от числа элементов страницы', async () => {
      // budget=1 режет первую же страницу из 1 элемента (< perPage) —
      // truncated обязан переопределить sanity-check, это обрыв по лимиту,
      // а не признак «страница неполная сама по себе».
      const budget = new ItemBudget(1);
      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([{ id: 1 }], linkNext('/v3/issues/A-1/comments?id=5')),
        requestNext: vi.fn(),
        perPage: 50,
        budget,
      });

      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('perPage не задан (дефолт API неизвестен) → sanity-check не применяется, legacy-поведение сохраняется', () => {
      // ВАЖНО: это не «исправлено», а зафиксированное текущее поведение.
      // Настоящий дефолт perPage у Яндекс.Трекера для /v3/issues/{id}/comments
      // НЕ задокументирован ни в этом клиенте, ни в референсном
      // yandex_tracker_client/ (проверено — per_page/perPage там всегда
      // опциональны, без значения по умолчанию), и WebFetch-проверка внешней
      // документации дала противоречивые ответы (одна попытка сообщила «50 по
      // умолчанию», повторный дословный запрос той же страницы это не
      // подтвердил) — считать недостоверным. Без реального numeric perPage
      // sanity-check (F3) сравнивать не с чем: применяется прежняя логика
      // (только Link/truncated). Это ЗНАЧИТ, что для вызовов без явного
      // perPage (ветка по умолчанию в GetCommentsOperation.execute и её
      // курсорная ветка) симптом из плана 3.3 (count:1, hasNextPage:true)
      // сохраняется — фикс требует правки вне границ этого пакета
      // (см. отчёт агента).
      const result = TrackerPaginator.singlePage(
        envelope([{ id: 1 }], linkNext('/v3/issues/A-1/comments?id=5')),
        { tag: CURSOR_TAGS.comments }
      );

      expect(result.pagination.perPage).toBeUndefined();
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('РЕГРЕССИЯ (план 3.3): одна страница из одного элемента при наличии Link — get_comments без perPage', () => {
      // Точное воспроизведение живого симптома: get_comments вызван без
      // perPage (перПейдж не передан агентом), у задачи один комментарий,
      // Трекер всё равно отдаёт Link rel="next". Тест документирует, что
      // simple in-file sanity-check (F3) эту ветку НЕ закрывает — см.
      // комментарий в тесте выше и отчёт агента с предложением, что менять
      // вне границ пакета (передача эффективного perPage со стороны
      // GetCommentsOperation).
      const result = TrackerPaginator.singlePage(
        envelope([{ id: 'COMMENT-1' }], linkNext('/v3/issues/PROJ-1/comments?id=1')),
        { tag: CURSOR_TAGS.comments }
      );

      expect(result.items).toHaveLength(1);
      expect(result.pagination.hasNextPage).toBe(true); // симптом сохраняется без perPage
    });
  });

  // --- cursor-режим (этап 1.1): включается передачей tag ---

  describe('buildMeta cursor-режим (tag)', () => {
    it('nextCursor кодируется из Link rel=next и декодируется обратно в путь', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: linkNext('/v3/issues/A-1/changelog?id=abc&perPage=50'),
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        nextUrl: 'https://api.tracker.yandex.net/v3/issues/A-1/changelog?id=abc&perPage=50',
        tag: CURSOR_TAGS.changelog,
      });

      expect(meta.hasNextPage).toBe(true);
      expect(meta.nextCursor).toBeDefined();
      expect(CursorCodec.decode(meta.nextCursor as string, CURSOR_TAGS.changelog).path).toBe(
        '/v3/issues/A-1/changelog?id=abc&perPage=50'
      );
      // поле page удалено из контракта meta
      expect('page' in meta).toBe(false);
    });

    it('без next — нет nextCursor, hasNextPage=false, fetchedAll=true', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {},
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        tag: CURSOR_TAGS.comments,
      });

      expect(meta.hasNextPage).toBe(false);
      expect(meta.nextCursor).toBeUndefined();
      expect(meta.fetchedAll).toBe(true);
    });

    it('seek-gating НЕГАТИВ: X-Total без rel=seek → нет total/totalPages (регрессия comments)', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {
          ...linkNext('/v3/issues/A-1/comments?id=5'),
          'x-total-count': '12',
          'x-total-pages': '4',
        },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        nextUrl: 'https://api.tracker.yandex.net/v3/issues/A-1/comments?id=5',
        tag: CURSOR_TAGS.comments,
      });

      expect(meta.total).toBeUndefined();
      expect(meta.totalPages).toBeUndefined();
      // листание всё равно возможно по курсору
      expect(meta.hasNextPage).toBe(true);
      expect(meta.nextCursor).toBeDefined();
    });

    it('seek-gating ПОЗИТИВ: rel=seek + X-Total → total/totalPages присутствуют (R8)', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {
          ...linkNextSeek('/v3/queues?page=2'),
          'x-total-count': '28',
          'x-total-pages': '14',
        },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        nextUrl: 'https://api.tracker.yandex.net/v3/queues?page=2',
        tag: CURSOR_TAGS.queues,
      });

      expect(meta.total).toBe(28);
      expect(meta.totalPages).toBe(14);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.nextCursor).toBeDefined();
    });

    it('последняя seekable-страница: seek+X-Total без next → total есть, hasNextPage=false (R8/X1)', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: {
          link: '<https://api.tracker.yandex.net/v3/queues?{&page}>; rel="seek"',
          'x-total-count': '28',
          'x-total-pages': '14',
        },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        tag: CURSOR_TAGS.queues,
      });

      expect(meta.total).toBe(28);
      expect(meta.totalPages).toBe(14);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.nextCursor).toBeUndefined();
      expect(meta.fetchedAll).toBe(true);
    });
  });

  describe('singlePage cursor-режим (tag)', () => {
    it('nextCursor из Link rel=next с id= (id-cursor эндпоинт)', () => {
      // perPage=2 совпадает с числом элементов страницы — sanity-check (F3)
      // не должен погасить hasNextPage/nextCursor (страница полная).
      const result = TrackerPaginator.singlePage(
        envelope([1, 2], linkNext('/v3/issues/A-1/comments?id=99&perPage=50')),
        { perPage: 2, tag: CURSOR_TAGS.comments }
      );

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
      expect(
        CursorCodec.decode(result.pagination.nextCursor as string, CURSOR_TAGS.comments).path
      ).toBe('/v3/issues/A-1/comments?id=99&perPage=50');
      expect('page' in result.pagination).toBe(false);
    });

    it('mid-page truncation (droppedByLimit) НЕ выдаёт nextCursor (F2)', async () => {
      // budget=3 режет первую страницу из 5 записей посреди → resume небезопасен
      const budget = new ItemBudget(3);
      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2, 3, 4, 5], linkNext('/v3/items?page=2')),
        requestNext: vi.fn(),
        tag: CURSOR_TAGS.comments,
        budget,
      });

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
      // nextCursor подавлен: он указывал бы на page=2, пропуская записи 4,5
      expect(result.pagination.nextCursor).toBeUndefined();
    });
  });

  describe('cursorExtra (хеш тела для find_issues, R2)', () => {
    it('cursorExtra вшивается в nextCursor и извлекается при decode', () => {
      // perPage=1 совпадает с числом элементов страницы, чтобы sanity-check
      // (F3) не погасил hasNextPage/nextCursor — тест проверяет cursorExtra,
      // а не sanity-логику.
      const result = TrackerPaginator.singlePage(
        envelope([1], linkNext('/v3/issues/_search?page=2')),
        { perPage: 1, tag: CURSOR_TAGS.findIssues, cursorExtra: 'hash-abc' }
      );

      expect(result.pagination.nextCursor).toBeDefined();
      const decoded = CursorCodec.decode(
        result.pagination.nextCursor as string,
        CURSOR_TAGS.findIssues
      );
      expect(decoded.path).toBe('/v3/issues/_search?page=2');
      expect(decoded.extra).toBe('hash-abc');
    });
  });

  describe('fetchAllPages cursor-режим (tag)', () => {
    it('truncated по maxItems → nextCursor для возобновления', async () => {
      const requestNext = vi
        .fn()
        .mockResolvedValueOnce(envelope([3, 4], linkNext('/v3/items?page=3')));

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2], linkNext('/v3/items?page=2')),
        requestNext,
        maxItems: 4,
        tag: CURSOR_TAGS.findIssues,
      });

      expect(result.items).toEqual([1, 2, 3, 4]);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
      expect(
        CursorCodec.decode(result.pagination.nextCursor as string, CURSOR_TAGS.findIssues).path
      ).toBe('/v3/items?page=3');
    });

    it('полный обход seekable → total сохраняется на финальной странице, нет nextCursor', async () => {
      const requestNext = vi.fn().mockResolvedValueOnce(
        envelope([3, 4], {
          link: '<https://api.tracker.yandex.net/v3/queues?{&page}>; rel="seek"',
          'x-total-count': '4',
          'x-total-pages': '2',
        })
      );

      const result = await TrackerPaginator.fetchAllPages({
        firstResponse: envelope([1, 2], linkNextSeek('/v3/queues?page=2')),
        requestNext,
        tag: CURSOR_TAGS.queues,
      });

      expect(result.items).toEqual([1, 2, 3, 4]);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.nextCursor).toBeUndefined();
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
    });
  });
});
