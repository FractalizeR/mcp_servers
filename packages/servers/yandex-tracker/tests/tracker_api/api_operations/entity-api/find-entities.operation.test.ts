import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { FindEntitiesOperation } from '#tracker_api/api_operations/entity-api/find-entities.operation.js';
import { CursorCodec, CURSOR_TAGS } from '#tracker_api/utils/index.js';

describe('FindEntitiesOperation', () => {
  let operation: FindEntitiesOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      getWithResponse: vi.fn(),
      postWithResponse: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    } as unknown as IHttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new FindEntitiesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  // Форма подтверждена живыми пробами 2026-08-15: {hits, pages, values}.
  it('конверт {hits, pages, values}: первая страница, есть ещё страницы', async () => {
    const items = [{ id: '1', self: 'url', version: 1, shortId: 'PRJ-1', entityType: 'project' }];
    vi.mocked(mockHttpClient.post).mockResolvedValue({ hits: 5, pages: 3, values: items });

    const result = await operation.execute({ entityType: 'project', searchString: 'revenue' });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v3/entities/project/_search?perPage=100&page=1',
      { input: 'revenue' },
      true
    );
    expect(result.items).toEqual(items);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.nextCursor).toBeDefined();
  });

  it('конверт {hits, pages, values}: одна страница целиком (currentPage=pages) — hasNextPage=false, курсора нет', async () => {
    const items = [{ id: '1', self: 'url', version: 1, shortId: 'PRJ-1', entityType: 'project' }];
    vi.mocked(mockHttpClient.post).mockResolvedValue({ hits: 1, pages: 1, values: items });

    const result = await operation.execute({ entityType: 'project', searchString: 'revenue' });

    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.nextCursor).toBeUndefined();
  });

  // РЕГРЕССИЯ: живой API на пустой выдаче отдаёт конверт БЕЗ ключа `values`
  // вообще (наблюдалось на entityType=goal — в организации целей не было).
  // ДО фикса, ждавшего голый массив, это падало `TypeError: response.data is
  // not iterable`. Падение до фикса доказано откатом с возвратом (см. отчёт
  // агента: временный revert на `[...response.data]`).
  it('конверт БЕЗ values (пустая выдача) → пустая страница, а не падение', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ hits: 0, pages: 0 });

    const result = await operation.execute({ entityType: 'goal', searchString: 'nothing-matches' });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.fetchedAll).toBe(true);
  });

  it('forward-compat: голый массив (форма референсного клиента, живьём не наблюдалась) — не падает', async () => {
    const items = [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }];
    vi.mocked(mockHttpClient.post).mockResolvedValue(items);

    const result = await operation.execute({ entityType: 'goal', searchString: 'revenue' });

    expect(result.items).toEqual(items);
    // Голый массив не несёт hits/pages → total/totalPages отсутствуют, но
    // элементы не теряются и вызов не падает.
    expect(result.pagination.total).toBeUndefined();
    expect(result.pagination.hasNextPage).toBe(false);
  });

  it('неожиданная форма ответа (например {results: [...]}) — явная ошибка с диагностикой', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ results: [{ id: '1' }] });

    await expect(
      operation.execute({ entityType: 'goal', searchString: 'revenue' })
    ).rejects.toThrow(/неожиданную форму ответа для _search/);
  });

  it('values присутствует, но не массив — явная ошибка, а не тихая подмена', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ hits: 1, pages: 1, values: 'not-an-array' });

    await expect(
      operation.execute({ entityType: 'goal', searchString: 'revenue' })
    ).rejects.toThrow(/values.*не является массивом/);
  });

  it('cursor с несовпадающим хешем критериев — explicit error', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
      hits: 3,
      pages: 2,
      values: [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }],
    });

    const first = await operation.execute({ entityType: 'goal', searchString: 'revenue' });
    const cursor = first.pagination.nextCursor;
    expect(cursor).toBeDefined();

    await expect(
      operation.execute({
        entityType: 'goal',
        searchString: 'DIFFERENT CRITERIA',
        cursor,
      })
    ).rejects.toThrow(/не совпадают с курсором/);
  });

  it('cursor с совпадающим хешем — резюмирует по номеру страницы, зашитому в путь', async () => {
    const firstItems = [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }];
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({ hits: 2, pages: 2, values: firstItems });

    const first = await operation.execute({ entityType: 'goal', searchString: 'revenue' });
    const cursor = first.pagination.nextCursor as string;

    const secondItems = [{ id: '2', self: 'url', version: 1, shortId: 'G-2', entityType: 'goal' }];
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
      hits: 2,
      pages: 2,
      values: secondItems,
    });

    const second = await operation.execute({
      entityType: 'goal',
      searchString: 'revenue',
      cursor,
    });

    expect(second.items).toEqual(secondItems);
    expect(second.pagination.hasNextPage).toBe(false);
    expect(mockHttpClient.post).toHaveBeenLastCalledWith(
      '/v3/entities/goal/_search?perPage=100&page=2',
      { input: 'revenue' },
      true
    );
  });

  it('fetchAll=true: обходит страницы по номеру до исчерпания pages', async () => {
    vi.mocked(mockHttpClient.post)
      .mockResolvedValueOnce({
        hits: 3,
        pages: 2,
        values: [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }],
      })
      .mockResolvedValueOnce({
        hits: 3,
        pages: 2,
        values: [
          { id: '2', self: 'url', version: 1, shortId: 'G-2', entityType: 'goal' },
          { id: '3', self: 'url', version: 1, shortId: 'G-3', entityType: 'goal' },
        ],
      });

    const result = await operation.execute({
      entityType: 'goal',
      searchString: 'revenue',
      fetchAll: true,
    });

    expect(result.items).toHaveLength(3);
    expect(result.pagination.fetchedAll).toBe(true);
    expect(result.pagination.pagesFetched).toBe(2);
    expect(mockHttpClient.post).toHaveBeenNthCalledWith(
      2,
      '/v3/entities/goal/_search?perPage=100&page=2',
      { input: 'revenue' },
      true
    );
  });

  it('fetchAll=true: пустая выдача (конверт без values) → пустой результат, без похода за второй страницей', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({ hits: 0, pages: 0 });

    const result = await operation.execute({
      entityType: 'goal',
      searchString: 'nothing-matches',
      fetchAll: true,
    });

    expect(result.items).toEqual([]);
    expect(result.pagination.fetchedAll).toBe(true);
    expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
  });

  it('fetchAll=true: maxItems режет хвост страницы → truncated=true, без nextCursor', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce({
      hits: 5,
      pages: 3,
      values: [
        { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' },
        { id: '2', self: 'url', version: 1, shortId: 'G-2', entityType: 'goal' },
      ],
    });

    const result = await operation.execute({
      entityType: 'goal',
      searchString: 'revenue',
      fetchAll: true,
      maxItems: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.truncated).toBe(true);
    expect(result.pagination.nextCursor).toBeUndefined();
    expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
  });
  describe('регрессия: содержательные поля надо запрашивать явно', () => {
    // Та же причина, что и у get_entity: без `?fields=` конверт `_search`
    // приходит без объекта `fields` записей (живая проба 2026-08-20).
    it('переносит запрошенные поля в query `fields` и сохраняет их в nextCursor', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        hits: 10,
        pages: 5,
        values: [{ id: '1', fields: { summary: 'S' } }],
      });

      const result = await operation.execute({
        entityType: 'project',
        perPage: 2,
        entityFields: ['summary'],
      });

      const [path] = vi.mocked(mockHttpClient.post).mock.calls[0] as [string, unknown, boolean];
      expect(path).toContain('fields=summary');

      const decoded = CursorCodec.decode(
        result.pagination.nextCursor as string,
        CURSOR_TAGS.findEntities
      );
      expect(decoded.path).toContain('fields=summary');
    });

    it('курсор отклоняется, если проекция изменилась между вызовами', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        hits: 10,
        pages: 5,
        values: [{ id: '1', fields: { summary: 'S' } }],
      });

      const first = await operation.execute({
        entityType: 'project',
        perPage: 2,
        entityFields: ['summary'],
      });
      const cursor = first.pagination.nextCursor as string;

      // Путь следующей страницы вшит в курсор вместе с `fields`. Если бы
      // проекция не входила в хеш, запрос ушёл бы со старым набором полей,
      // а ответ был бы отфильтрован и подписан новым — агент получил бы
      // пустоту под видом запрошенных полей.
      await expect(
        operation.execute({
          entityType: 'project',
          cursor,
          entityFields: ['description'],
        })
      ).rejects.toThrow(/не совпадают с курсором/);
    });

    it('без запрошенных полей query `fields` не добавляется', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        hits: 1,
        pages: 1,
        values: [{ id: '1' }],
      });

      await operation.execute({ entityType: 'project', perPage: 2, entityFields: [] });

      const [path] = vi.mocked(mockHttpClient.post).mock.calls[0] as [string, unknown, boolean];
      expect(path).not.toContain('fields=');
    });
  });
});
