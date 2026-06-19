import { describe, it, expect, vi } from 'vitest';
import type { HttpResponseEnvelope, ResponseHeaders } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator, DEFAULT_MAX_ITEMS } from '#tracker_api/utils/tracker-paginator.util.js';
import { ItemBudget } from '#tracker_api/utils/item-budget.util.js';

/** Хелпер: собрать конверт ответа. */
function envelope<T>(data: T[], headers: ResponseHeaders = {}): HttpResponseEnvelope<T[]> {
  return { data, headers };
}

/** Хелпер: заголовок Link с next на относительный путь. */
function linkNext(path: string): ResponseHeaders {
  return { link: `<https://api.tracker.yandex.net${path}>; rel="next"` };
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
    it('заполняет total/totalPages из X-Total-* заголовков', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: { 'x-total-count': '150', 'x-total-pages': '3' },
        pagesFetched: 1,
        truncated: false,
        hasError: false,
        page: 1,
        perPage: 50,
      });

      expect(meta.total).toBe(150);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(true); // 1*50 < 150
      expect(meta.fetchedAll).toBe(false);
    });

    it('без X-Total-* не заполняет total/totalPages', () => {
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

    it('игнорирует нечисловой X-Total-Count', () => {
      const meta = TrackerPaginator.buildMeta({
        headers: { 'x-total-count': 'n/a' },
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
      const result = TrackerPaginator.singlePage(envelope([1, 2, 3]), { page: 1, perPage: 50 });

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.truncated).toBe(false);
      expect(result.pagination.hasError).toBe(false);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.perPage).toBe(50);
    });

    it('есть Link rel=next — hasNextPage=true, fetchedAll=false (есть ещё данные)', () => {
      const result = TrackerPaginator.singlePage(envelope([1, 2], linkNext('/v3/items?page=2')));

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.truncated).toBe(false);
    });

    it('X-Total-* прокидываются в метаданные', () => {
      const result = TrackerPaginator.singlePage(
        envelope([1, 2], { 'x-total-count': '42', 'x-total-pages': '21' }),
        { page: 1, perPage: 2 }
      );

      expect(result.pagination.total).toBe(42);
      expect(result.pagination.totalPages).toBe(21);
      // page*perPage (1*2=2) < total(42) → есть ещё данные
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('копирует массив items (не держит ссылку на response.data)', () => {
      const data = [1, 2];
      const result = TrackerPaginator.singlePage(envelope(data));
      expect(result.items).not.toBe(data);
      expect(result.items).toEqual([1, 2]);
    });
  });
});
