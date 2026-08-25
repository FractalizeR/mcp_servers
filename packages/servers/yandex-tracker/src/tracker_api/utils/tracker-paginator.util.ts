/**
 * TrackerPaginator — доменная логика пагинации Яндекс.Трекера.
 *
 * Ответственность (SRP):
 * - проход по страницам через `Link rel="next"` (cursor) с защитными лимитами;
 * - нормализация next-URL в относительный путь (`stripHost`, аналог Python `_strip_host`);
 * - сборка `PaginationMeta` из заголовков ответа (`X-Total-Count`/`X-Total-Pages`).
 *
 * Generic-примитивы (`parseLinkHeader`, нормализация заголовков) живут во
 * фреймворке `@fractalizer/mcp-infrastructure`; здесь — только доменная политика
 * Трекера (seek/X-Total, maxItems/maxPages, частичный отказ).
 *
 * Ссылки: `yandex_tracker_client/connection.py`, `objects.py:268-330`.
 */

import { parseLinkHeader } from '@fractalizer/mcp-infrastructure';
import type { HttpResponseEnvelope, ResponseHeaders } from '@fractalizer/mcp-infrastructure';

import type { PaginatedResult, PaginationMeta } from '../entities/common/index.js';
import { CursorCodec } from './cursor-codec.util.js';
import type { CursorTag } from './cursor-codec.util.js';
import type { ItemBudget } from './item-budget.util.js';
import { stripTrackerHost } from './strip-host.util.js';

/** Защитный лимит по записям (прокси токенов агента). */
export const DEFAULT_MAX_ITEMS = 500;

/** Вторичный backstop по числу страниц (защита от рантэвея). */
export const DEFAULT_MAX_PAGES = 100;

/**
 * Рекомендуемый максимум `perPage` для режима fetchAll.
 *
 * Операции поднимают `perPage` к этому значению ради меньшего числа
 * round-trip'ов; `maxItems` всё равно режет финальную выдачу.
 */
export const DEFAULT_MAX_PER_PAGE = 100;

/**
 * НАШ явный дефолт `perPage` для курсорных (не-seek) list-эндпоинтов
 * (`comments`/`changelog`/`links`/`worklog`/`checklist`/`users`/`worklogSearch`)
 * в single-page режиме (`fetchAll` не задан), когда агент не передал `perPage`
 * сам.
 *
 * ВАЖНО: это НЕ задокументированный дефолт API Яндекс.Трекера — настоящий
 * серверный дефолт не подтверждён ни референсным клиентом
 * (`yandex_tracker_client/`, там `per_page`/`perPage` всегда опциональны без
 * значения по умолчанию), ни официальной документацией (повторный запрос той
 * же страницы дал противоречивый ответ — недостоверно, см. план
 * `.agentic-planning/plan_tracker_tool_fixes/3.3_pagination_sanity_parallel.md`
 * и пакет 3.4 того же плана). Раз угадать нельзя, значение — наш осознанный
 * выбор, и операции ОБЯЗАНЫ слать его ЯВНО в каждом запросе (а не полагаться
 * на дефолт сервера), чтобы `perPage` был всегда известен `buildMeta` для
 * sanity-проверки `hasNextPage` (F3, см. `buildMeta` ниже) — без этого при
 * одном элементе на странице Трекер всё равно шлёт `Link rel="next"`, и
 * `hasNextPage` ложно остаётся `true` (симптом плана 3.3/3.4: `get_comments`
 * без явного `perPage` стабильно отдавал `count:1, hasNextPage:true`).
 */
export const DEFAULT_PER_PAGE = 50;

/**
 * Входные данные для сборки `PaginationMeta`.
 */
export interface BuildMetaInput {
  /** Нормализованные заголовки финального ответа (lowercase-ключи). */
  readonly headers: ResponseHeaders;
  /** Сколько страниц фактически загружено. */
  readonly pagesFetched: number;
  /** Выдача обрезана защитным лимитом. */
  readonly truncated: boolean;
  /** Был частичный отказ при обходе. */
  readonly hasError: boolean;
  /** URL следующей страницы, если ещё есть данные. */
  readonly nextUrl?: string | undefined;
  /** Размер страницы (если применимо к запросу). */
  readonly perPage?: number | undefined;
  /**
   * Число элементов на последней фактически загруженной странице.
   *
   * Используется для sanity-проверки `hasNextPage` (F3): Трекер на
   * курсорных ручках (`comments` и т.п.) отдаёт `Link rel="next"` ВСЕГДА,
   * даже когда следующая страница пуста. Если известен запрошенный
   * `perPage` и страница вернула меньше элементов — следующей страницы
   * нет, что бы ни говорил заголовок. Без `perPage` сравнивать не с чем,
   * применяется легаси-логика (только `Link`/`truncated`).
   *
   * Опционален ради обратной совместимости прямых вызовов `buildMeta` (в
   * первую очередь тестовых): без него sanity-проверка не применяется
   * (эквивалентно «страница не короче perPage»), что сохраняет прежнее
   * поведение до миграции конкретного вызывающего кода.
   */
  readonly pageItemCount?: number | undefined;
  /**
   * Тег семейства эндпоинта. При наличии в `nextCursor` кодируется путь
   * следующей страницы (`CursorCodec.encode(path, tag, cursorExtra)`).
   * Непагинируемые эндпоинты тег не передают → `nextCursor` отсутствует.
   *
   * Независимо от тега: `total`/`totalPages` отдаются ТОЛЬКО при `rel="seek"`
   * (seek-gating), а `hasNextPage` выводится из `Link rel="next"`/`truncated`.
   */
  readonly tag?: CursorTag | undefined;
  /**
   * Доп. нагрузка семейства эндпоинта, вшиваемая в `nextCursor`
   * (`CursorCodec.encode(path, tag, cursorExtra)`).
   *
   * Используется `find_issues` (`_search`) для хеша канонического тела (R2):
   * операция кладёт сюда хеш, чтобы при возобновлении сверить повторно
   * переданные критерии. Игнорируется без `tag`.
   */
  readonly cursorExtra?: string | undefined;
}

/**
 * Опции полного обхода `fetchAllPages`.
 */
export interface FetchAllPagesOptions<T> {
  /** Уже полученная первая страница (data + заголовки). */
  readonly firstResponse: HttpResponseEnvelope<T[]>;
  /**
   * Как запросить следующую страницу по относительному пути.
   *
   * Для GET — `getWithResponse(path)`; для POST `_search` — `postWithResponse`
   * с тем же телом (иначе next вернёт не то).
   */
  readonly requestNext: (path: string) => Promise<HttpResponseEnvelope<T[]>>;
  /** Лимит по записям (дефолт `DEFAULT_MAX_ITEMS`). */
  readonly maxItems?: number;
  /** Лимит по страницам (дефолт `DEFAULT_MAX_PAGES`). */
  readonly maxPages?: number;
  /** Размер страницы — прокидывается в метаданные. */
  readonly perPage?: number;
  /**
   * Общий бюджет записей на весь batch-ответ (необязателен).
   *
   * Если задан — цепочка берёт не больше `min(maxItems, budget.remaining)`
   * записей и атомарно списывает собранное. По исчерпании бюджета цепочка
   * останавливается с `truncated=true`.
   */
  readonly budget?: ItemBudget;
  /**
   * Тег семейства эндпоинта — включает cursor-режим (см. {@link BuildMetaInput.tag}).
   * Без него финальная meta строится в легаси-режиме (без `nextCursor`).
   */
  readonly tag?: CursorTag;
  /**
   * Доп. нагрузка в `nextCursor` финальной meta (хеш тела `_search`, R2).
   * См. {@link BuildMetaInput.cursorExtra}.
   */
  readonly cursorExtra?: string;
  /** Колбэк для логирования частичного отказа (warning). */
  readonly onError?: (error: unknown, pagesFetched: number) => void;
}

/**
 * Доменный паджинатор Яндекс.Трекера.
 */
export class TrackerPaginator {
  /**
   * Превратить next-URL в относительный путь + query (delegate к {@link stripTrackerHost}).
   *
   * Сохранён как публичный статический метод для обратной совместимости с
   * существующими вызовами/тестами; логика — в общем модуле `strip-host.util`,
   * чтобы её разделяли паджинатор и `CursorCodec` без циклической зависимости.
   *
   * @param url - абсолютный или относительный next-URL
   * @returns путь+query или `undefined`, если путь не похож на API Трекера
   */
  public static stripHost(url: string): string | undefined {
    return stripTrackerHost(url);
  }

  /**
   * Собрать `PaginationMeta` из заголовков и состояния обхода.
   *
   * - `hasNextPage` выводится из `Link rel="next"` (+ `truncated` при
   *   срабатывании защитного лимита) с sanity-поправкой (F3) для НЕ-seek
   *   курсорных ручек Трекера (`comments`/`changelog`/`links`/`worklog`/
   *   `checklist`): такие ручки отдают `Link rel="next"` ВСЕГДА, даже когда
   *   следующая страница пуста. Если известен запрошенный `perPage` и
   *   страница вернула меньше элементов — следующей страницы нет, что бы ни
   *   говорил заголовок (`truncated=true` всё равно держит
   *   `hasNextPage=true` — это обрыв по защитному лимиту, другой смысл).
   *   Без `perPage` сравнивать не с чем (истинный дефолт API методом самого
   *   Трекера нам неизвестен и не задокументирован ни в клиенте, ни в
   *   `yandex_tracker_client/` — легаси-поведение (только `Link`/`truncated`)
   *   сохраняется без изменений).
   *   На seekable-эндпоинтах (`rel="seek"` присутствует — queues/projects/
   *   `_search`) sanity-поправка НЕ применяется: там `X-Total-Count` —
   *   авторитетный источник (см. seek-gating ниже), и `Link rel="next"` при
   *   `total > возвращено` корректно сигналит о данных дальше, даже если
   *   страница короче `perPage` (пример: R8-тест `get-queues.operation` —
   *   2 записи из 42 при `perPage=50`, но следующая страница реально есть);
   * - `total`/`totalPages` отдаются ТОЛЬКО при `rel="seek"` (seek-gating против
   *   ложного `totalPages` у cursor-эндпоинтов вроде comments);
   * - `nextCursor` кодируется при наличии `tag` И реального `Link rel="next"`
   *   в ответе (независимо от sanity-поправки `hasNextPage` — находка №3,
   *   внешнее ревью 2026-08). Инвариант ИЗМЕНЁН: раньше было `nextCursor` ⟺
   *   `hasNextPage`, теперь `nextCursor` присутствует ⊇ `hasNextPage`
   *   (курсор может быть выдан и когда `hasNextPage=false` благодаря
   *   sanity-поправке). Курсору можно доверять — он приходит от сервера;
   *   `hasNextPage` — это НАША догадка на основе эвристики perPage-сравнения,
   *   которая может ошибаться в обе стороны (подтверждено вживую на v2:
   *   `/issues/{id}/checklistItems` игнорирует `perPage`; после миграции 4.1
   *   путь ходит на v3, на v3 наблюдение не переснималось). Подавлять
   *   курсор вместе с ложным `hasNextPage=false` означало бы необнаружимую
   *   потерю данных — агент физически не смог бы дочитать остаток. См.
   *   обновлённый JSDoc `PaginationMeta.nextCursor`/`hasNextPage`.
   */
  public static buildMeta(input: BuildMetaInput): PaginationMeta {
    const path = input.nextUrl !== undefined ? stripTrackerHost(input.nextUrl) : undefined;
    const linkSuggestsNext = Boolean(path);
    const hasSeek = parseLinkHeader(input.headers['link'])['seek'] !== undefined;
    const belowRequestedPerPage =
      !hasSeek &&
      input.perPage !== undefined &&
      input.pageItemCount !== undefined &&
      input.pageItemCount < input.perPage;
    const hasNextPage = input.truncated || (linkSuggestsNext && !belowRequestedPerPage);
    const fetchedAll = !hasNextPage && !input.hasError;

    const total = hasSeek
      ? TrackerPaginator.parseIntHeader(input.headers['x-total-count'])
      : undefined;
    const totalPages = hasSeek
      ? TrackerPaginator.parseIntHeader(input.headers['x-total-pages'])
      : undefined;

    // Находка №3 (MAJOR, внешнее ревью 2026-08): `nextCursor` кодируется при
    // РЕАЛЬНОМ наличии `Link rel="next"` (`path !== undefined`), НЕЗАВИСИМО
    // от sanity-поправки `hasNextPage` выше. Курсор не врёт — он приходит от
    // сервера; `hasNextPage`/`belowRequestedPerPage` — это лишь НАША догадка
    // "следующая страница, вероятно, пуста", основанная на эвристике
    // perPage-сравнения. Если эвристика ошиблась (сервер клампит perPage
    // своим потолком, либо отдал неполную страницу из-за прав доступа —
    // подтверждено вживую на v2: `/issues/{id}/checklistItems` игнорирует
    // `perPage`, при запрошенном `perPage=1` вернул 4 элемента (после миграции
    // 4.1 путь ходит на v3, на v3 наблюдение не переснималось), старое
    // поведение (`nextCursor` только при `hasNextPage===true`) молча гасило
    // курсор ВМЕСТЕ с признаком «есть данные», и агент не мог физически
    // дочитать остаток — необнаружимая потеря данных ценой дороже одного
    // лишнего пустого запроса, которым раньше расплачивались за ложный
    // `hasNextPage:true`. Инвариант "nextCursor ⟺ hasNextPage" ИЗМЕНЁН:
    // `hasNextPage` — «мы уверены, что дальше есть данные», `nextCursor` —
    // «вот чем дочитать, если хочешь проверить сам» (см. обновлённый JSDoc
    // `PaginationMeta.nextCursor` в `pagination.entity.ts`).
    const nextCursor =
      path !== undefined && input.tag !== undefined
        ? CursorCodec.encode(path, input.tag, input.cursorExtra)
        : undefined;

    return {
      hasNextPage,
      fetchedAll,
      truncated: input.truncated,
      hasError: input.hasError,
      pagesFetched: input.pagesFetched,
      ...(input.perPage !== undefined ? { perPage: input.perPage } : {}),
      ...(total !== undefined ? { total } : {}),
      ...(totalPages !== undefined ? { totalPages } : {}),
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    };
  }

  /**
   * Обернуть одну (первую) страницу в `PaginatedResult` с метаданными.
   *
   * Режим по умолчанию (без `fetchAll`): один запрос, `hasNextPage`
   * вычисляется из заголовков `Link`/`X-Total-*`. Агент листает вручную
   * через `page`.
   *
   * `nextCursor` появляется в meta при передаче `opts.tag` (если в ответе есть
   * `Link rel="next"`). `total`/`totalPages` — только при `rel="seek"`.
   * Непагинируемые эндпоинты вызывают без `tag` → `nextCursor` отсутствует.
   *
   * @param response - конверт ответа (data + заголовки)
   * @param opts - размер страницы / тег эндпоинта для проброса в метаданные
   */
  public static singlePage<T>(
    response: HttpResponseEnvelope<T[]>,
    opts: {
      readonly perPage?: number | undefined;
      readonly tag?: CursorTag | undefined;
      readonly cursorExtra?: string | undefined;
    } = {}
  ): PaginatedResult<T> {
    const next = TrackerPaginator.nextUrl(response.headers);

    const meta = TrackerPaginator.buildMeta({
      headers: response.headers,
      pagesFetched: 1,
      truncated: false,
      hasError: false,
      nextUrl: next,
      pageItemCount: response.data.length,
      ...(opts.perPage !== undefined ? { perPage: opts.perPage } : {}),
      ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
      ...(opts.cursorExtra !== undefined ? { cursorExtra: opts.cursorExtra } : {}),
    });

    return { items: [...response.data], pagination: meta };
  }

  /**
   * Полный обход по `Link rel="next"` до исчерпания или защитного лимита.
   *
   * Страницы строго последовательны (next известен только из предыдущего
   * ответа). При ошибке после страниц 1..N-1 возвращается частичный результат
   * с `hasError=true`, собранное не теряется.
   */
  public static async fetchAllPages<T>(opts: FetchAllPagesOptions<T>): Promise<PaginatedResult<T>> {
    const maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
    const budget = opts.budget;

    const items: T[] = [];
    let droppedByLimit = false;

    // Принять записи страницы с учётом per-chain `maxItems` и общего `budget`.
    // Списание из бюджета синхронно (между чтением и consume нет await),
    // поэтому параллельные цепочки суммарно не превышают общий потолок.
    const accept = (data: T[]): void => {
      const chainRoom = maxItems - items.length;
      const budgetRoom = budget !== undefined ? budget.remaining : Number.POSITIVE_INFINITY;
      const room = Math.max(0, Math.min(chainRoom, budgetRoom));
      const take = Math.min(data.length, room);
      if (take > 0) {
        items.push(...data.slice(0, take));
        budget?.consume(take);
      }
      if (take < data.length) {
        droppedByLimit = true;
      }
    };

    accept(opts.firstResponse.data);
    let pagesFetched = 1;
    let headers = opts.firstResponse.headers;
    let next = TrackerPaginator.nextUrl(headers);
    let hasError = false;
    // Число элементов последней ФАКТИЧЕСКИ загруженной страницы (для buildMeta,
    // см. F3-sanity-check). fetchAllPages уже физически проходит страницы до
    // исчезновения Link, поэтому здесь это в основном для консистентности
    // сигнатуры buildMeta — hasNextPage тут и так корректен через `truncated`.
    let lastPageItemCount = opts.firstResponse.data.length;

    const limitReached = (): boolean =>
      items.length >= maxItems || (budget !== undefined && budget.remaining <= 0);

    while (next !== undefined && !limitReached() && pagesFetched < maxPages) {
      const path = TrackerPaginator.stripHost(next);
      if (path === undefined) {
        next = undefined;
        break;
      }

      let response: HttpResponseEnvelope<T[]>;
      try {
        response = await opts.requestNext(path);
      } catch (error) {
        hasError = true;
        opts.onError?.(error, pagesFetched);
        break;
      }

      accept(response.data);
      pagesFetched += 1;
      headers = response.headers;
      next = TrackerPaginator.nextUrl(headers);
      lastPageItemCount = response.data.length;
    }

    // truncated, если остались данные (next) или мы отбросили часть страницы
    // по защитному лимиту (maxItems/budget).
    const truncated = next !== undefined || droppedByLimit;

    // ВАЖНО (F2): при mid-page truncation (`droppedByLimit`) `next` указывает на
    // СЛЕДУЮЩУЮ API-страницу, пропуская отброшенный хвост текущей. Безопасного
    // курсора на середину страницы нет, поэтому `nextCursor` НЕ выдаём (передаём
    // nextUrl=undefined). `truncated=true` всё равно держит `hasNextPage=true` —
    // агент видит, что выдача обрезана, но не может «возобновить» с пропуском.
    const safeNextUrl = droppedByLimit ? undefined : next;

    const meta = TrackerPaginator.buildMeta({
      headers,
      pagesFetched,
      truncated,
      hasError,
      nextUrl: safeNextUrl,
      pageItemCount: lastPageItemCount,
      ...(opts.perPage !== undefined ? { perPage: opts.perPage } : {}),
      ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
      ...(opts.cursorExtra !== undefined ? { cursorExtra: opts.cursorExtra } : {}),
    });

    return { items, pagination: meta };
  }

  /**
   * Извлечь URL следующей страницы из заголовка `Link`.
   */
  private static nextUrl(headers: ResponseHeaders): string | undefined {
    return parseLinkHeader(headers['link'])['next'];
  }

  /**
   * Извлечь `perPage` из query-строки относительного пути (обычно —
   * декодированный курсор, т.е. путь из `Link rel="next"` предыдущего
   * ответа).
   *
   * Используется в курсорных ветках операций (2-я и последующие страницы),
   * чтобы `buildMeta` знал `perPage` для sanity-проверки (F3) даже когда сам
   * вызывающий код явного `perPage` на эту страницу не передавал — путь уже
   * несёт РЕАЛЬНО применённый API размер страницы (мы сами кладём `perPage`
   * в запрос первой страницы, см. {@link DEFAULT_PER_PAGE}, и Трекер
   * сохраняет query-параметры в `Link`). Если параметра нет — `undefined`
   * (деградация без ошибки: sanity-проверка на этой странице не применяется).
   */
  public static perPageFromPath(path: string): number | undefined {
    const queryString = path.split('?')[1];
    if (queryString === undefined) {
      return undefined;
    }
    return TrackerPaginator.parseIntHeader(
      new URLSearchParams(queryString).get('perPage') ?? undefined
    );
  }

  /**
   * Распарсить числовой заголовок; `undefined`, если заголовка нет или это не число.
   */
  private static parseIntHeader(value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
