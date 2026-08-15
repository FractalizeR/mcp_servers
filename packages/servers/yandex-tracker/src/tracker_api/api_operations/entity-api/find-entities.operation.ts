/**
 * Операция поиска/списка записей Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО поиск записей заданного entityType по критериям
 * - Отправка POST запроса на /v3/entities/{entityType}/_search
 * - Пагинация результатов (см. ниже — по номеру страницы, не по `Link`)
 * - НЕТ получения/создания/обновления/удаления одной записи
 *
 * API: POST /v3/entities/{entityType}/_search
 *
 * ФОРМА ОТВЕТА (подтверждено ЖИВЫМИ пробами 2026-08-15: три вызова подряд,
 * entityType=project/portfolio/goal, perPage=1): тело — конверт
 * `{ hits, pages, values }`, НЕ голый массив и НЕ пагинация через `Link`:
 *   - `values` — массив найденных записей; ОТСУТСТВУЕТ целиком при пустой
 *     выдаче (наблюдалось на `goal` — в организации целей не было, конверт
 *     пришёл как `{ hits, pages }` без ключа `values`);
 *   - `hits` — общее число найденных записей;
 *   - `pages` — общее число страниц при текущем `perPage`.
 *
 * Референсный клиент (`Entity.find`/`connection.decode_response`) эту форму
 * НЕ описывает — там предполагается голый массив + пагинация в заголовке
 * `Link` (тот же контракт, что у `find_issues`). Живой API опровергает эту
 * гипотезу; источник истины здесь — живая проба, а не референсный клиент
 * (клиент либо отстал от этой ручки, либо описывает другую её версию).
 * Голый массив оставлен как forward-compat fallback в `parseSearchEnvelope`
 * на случай будущего расхождения, но живьём не наблюдался.
 *
 * ПАГИНАЦИЯ: раз API отдаёт `pages` в ТЕЛЕ, а не `Link rel="next"` в
 * заголовке, страница адресуется явным query-параметром `page` (тот же
 * параметр поддерживает референсный клиент — `Entity.find(page=..., ...)`
 * как query). Курсорный Link-механизм сюда не тащится — его тут нет.
 *
 * Наружу это остаётся ОБЫЧНЫМ непрозрачным курсором — тем же контрактом,
 * что у остальных list-инструментов (корневой CLAUDE.md, п. 2.2): агент по
 * прежнему просто передаёт `pagination.nextCursor` обратно, не видя номеров
 * страниц. Курсор кодирует НЕ путь из `Link` (которого нет), а
 * самостоятельно построенный путь `.../_search?perPage=N&page=M`.
 * `total`/`totalPages` берутся из `hits`/`pages` напрямую, а не через
 * seek-gating по заголовкам (там для этой ручки взять их неоткуда).
 */

import { createHash } from 'node:crypto';

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  CursorCodec,
  CURSOR_TAGS,
  DEFAULT_MAX_PER_PAGE,
  DEFAULT_MAX_ITEMS,
  DEFAULT_MAX_PAGES,
} from '#tracker_api/utils/index.js';
import type { FindEntitiesDto } from '#tracker_api/dto/entity-api/index.js';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/common/index.js';

export type FindEntitiesResult = PaginatedResult<EntityApiRecordWithUnknownFields>;

/** Разобранный конверт `_search`: элементы страницы + счётчики API. */
interface ParsedSearchEnvelope {
  readonly items: EntityApiRecordWithUnknownFields[];
  readonly hits: number | undefined;
  readonly pages: number | undefined;
}

/**
 * Разобрать тело ответа `_search` в форму `{ hits, pages, values }`
 * (подтверждено живыми пробами — см. JSDoc модуля).
 *
 * Терпимо к двум крайним случаям без риска тихой потери данных:
 * - `values` отсутствует целиком → пустая страница (наблюдалось живьём на
 *   `goal` с нулевой выдачей);
 * - тело — «голый» массив (форма, которую предполагает референсный клиент;
 *   живьём НЕ наблюдалась, оставлена как forward-compat, не как догадка).
 *
 * Любая ДРУГАЯ форма — explicit-ошибка с дампом формы, а не тихая догадка
 * об имени поля.
 */
function parseSearchEnvelope(data: unknown): ParsedSearchEnvelope {
  if (Array.isArray(data)) {
    return {
      items: data as EntityApiRecordWithUnknownFields[],
      hits: undefined,
      pages: undefined,
    };
  }

  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if ('values' in obj || 'hits' in obj || 'pages' in obj) {
      const rawValues = obj['values'];
      if (rawValues !== undefined && !Array.isArray(rawValues)) {
        throw unexpectedShapeError(data, "поле 'values' присутствует, но не является массивом");
      }
      return {
        items: Array.isArray(rawValues) ? (rawValues as EntityApiRecordWithUnknownFields[]) : [],
        hits: typeof obj['hits'] === 'number' ? obj['hits'] : undefined,
        pages: typeof obj['pages'] === 'number' ? obj['pages'] : undefined,
      };
    }
  }

  if (data === null || data === undefined) {
    return { items: [], hits: undefined, pages: undefined };
  }

  throw unexpectedShapeError(data, 'ни массив, ни конверт {hits, pages, values}');
}

function unexpectedShapeError(data: unknown, reason: string): Error {
  const shapeHint =
    data !== null && typeof data === 'object'
      ? `объект с полями [${Object.keys(data).join(', ')}]`
      : typeof data;
  return new Error(
    `Entity API вернул неожиданную форму ответа для _search (${reason}): получено — ${shapeHint}. ` +
      'Ожидался конверт {hits, pages, values} (подтверждено живыми пробами) или, как fallback, ' +
      'голый JSON-массив. Нужна повторная живая проверка сырого тела ответа, прежде чем ' +
      'предполагать иную форму.'
  );
}

/** Разобрать `page`/`perPage` из query-строки самостоятельно построенного пути. */
function parsePageParams(path: string): { readonly page: number; readonly perPage: number } {
  const queryString = path.split('?')[1] ?? '';
  const query = new URLSearchParams(queryString);
  const pageRaw = query.get('page');
  const perPageRaw = query.get('perPage');
  const page = pageRaw !== null ? Number.parseInt(pageRaw, 10) : NaN;
  const perPage = perPageRaw !== null ? Number.parseInt(perPageRaw, 10) : NaN;
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : DEFAULT_MAX_PER_PAGE,
  };
}

export class FindEntitiesOperation extends BaseOperation {
  async execute(params: FindEntitiesDto): Promise<FindEntitiesResult> {
    const bodyHash = this.hashRequestBody(params);

    if (params.cursor !== undefined) {
      return this.fetchByCursor(params, bodyHash);
    }

    this.logger.info(`Поиск записей Entity API: ${params.entityType}`, {
      hasSearchString: !!params.searchString,
      hasFilter: !!params.filter,
      rootOnly: params.rootOnly ?? false,
      fetchAll: params.fetchAll === true,
    });

    const requestBody = this.buildRequestBody(params);
    const effectivePerPage = params.perPage ?? DEFAULT_MAX_PER_PAGE;

    // idempotencyDeclared: true — POST `_search` только читает.
    const firstEnvelope = parseSearchEnvelope(
      await this.httpClient.post<unknown>(
        this.buildEndpoint(params.entityType, effectivePerPage, 1),
        requestBody,
        true
      )
    );

    if (params.fetchAll !== true) {
      return {
        items: firstEnvelope.items,
        pagination: this.buildMeta({
          entityType: params.entityType,
          effectivePerPage,
          currentPage: 1,
          pagesFetched: 1,
          hits: firstEnvelope.hits,
          pages: firstEnvelope.pages,
          bodyHash,
          truncated: false,
          hasError: false,
        }),
      };
    }

    return this.fetchAll(params, requestBody, bodyHash, effectivePerPage, firstEnvelope);
  }

  /** Полный обход по номерам страниц (page=1,2,3,...) до `pages` или защитного лимита. */
  private async fetchAll(
    params: FindEntitiesDto,
    requestBody: Record<string, unknown>,
    bodyHash: string,
    effectivePerPage: number,
    firstEnvelope: ParsedSearchEnvelope
  ): Promise<FindEntitiesResult> {
    const maxItems = params.maxItems ?? DEFAULT_MAX_ITEMS;

    const items: EntityApiRecordWithUnknownFields[] = [];
    let droppedByLimit = false;

    const accept = (pageItems: readonly EntityApiRecordWithUnknownFields[]): void => {
      const room = Math.max(0, maxItems - items.length);
      const take = Math.min(pageItems.length, room);
      if (take > 0) {
        items.push(...pageItems.slice(0, take));
      }
      if (take < pageItems.length) {
        droppedByLimit = true;
      }
    };

    accept(firstEnvelope.items);
    let envelope = firstEnvelope;
    let currentPage = 1;
    let pagesFetched = 1;
    let hasError = false;

    const hasMorePages = (): boolean =>
      envelope.pages !== undefined && currentPage < envelope.pages;

    while (
      hasMorePages() &&
      items.length < maxItems &&
      !droppedByLimit &&
      pagesFetched < DEFAULT_MAX_PAGES
    ) {
      const nextPage = currentPage + 1;
      try {
        envelope = parseSearchEnvelope(
          await this.httpClient.post<unknown>(
            this.buildEndpoint(params.entityType, effectivePerPage, nextPage),
            requestBody,
            true
          )
        );
      } catch (error) {
        hasError = true;
        this.logger.warn('Частичный отказ при обходе страниц поиска Entity API', {
          error,
          pagesFetched,
        });
        break;
      }
      accept(envelope.items);
      pagesFetched += 1;
      currentPage = nextPage;
    }

    // droppedByLimit — обрезка ВНУТРИ страницы: следующая цельная страница
    // (currentPage+1) пропустила бы недобранный хвост текущей, безопасного
    // курсора на середину страницы нет (тот же F2-случай, что у Link-пагинации
    // в TrackerPaginator) — nextCursor в этом случае не предлагаем.
    const truncated = (hasMorePages() && !hasError) || droppedByLimit;

    return {
      items,
      pagination: this.buildMeta({
        entityType: params.entityType,
        effectivePerPage,
        currentPage,
        pagesFetched,
        hits: envelope.hits,
        pages: envelope.pages,
        bodyHash,
        truncated,
        hasError,
        offerNextCursor: !droppedByLimit,
      }),
    };
  }

  private async fetchByCursor(
    params: FindEntitiesDto,
    bodyHash: string
  ): Promise<FindEntitiesResult> {
    const { path, extra } = CursorCodec.decode(params.cursor as string, CURSOR_TAGS.findEntities);

    if (extra !== bodyHash) {
      throw new Error(
        'Критерии поиска не совпадают с курсором: searchString/filter/orderBy/rootOnly должны ' +
          'быть переданы повторно в том же виде, что и при первой выборке.'
      );
    }

    const requestBody = this.buildRequestBody(params);
    const { page: currentPage, perPage: effectivePerPage } = parsePageParams(path);

    const envelope = parseSearchEnvelope(
      await this.httpClient.post<unknown>(path, requestBody, true)
    );

    return {
      items: envelope.items,
      pagination: this.buildMeta({
        entityType: params.entityType,
        effectivePerPage,
        currentPage,
        pagesFetched: 1,
        hits: envelope.hits,
        pages: envelope.pages,
        bodyHash,
        truncated: false,
        hasError: false,
      }),
    };
  }

  /**
   * Собрать `PaginationMeta` из счётчиков конверта (`hits`/`pages`) — НЕ из
   * заголовков (их тут нет). `nextCursor` кодирует самостоятельно построенный
   * путь следующей страницы, а не путь из `Link`.
   */
  private buildMeta(input: {
    readonly entityType: string;
    readonly effectivePerPage: number;
    readonly currentPage: number;
    readonly pagesFetched: number;
    readonly hits: number | undefined;
    readonly pages: number | undefined;
    readonly bodyHash: string;
    readonly truncated: boolean;
    readonly hasError: boolean;
    readonly offerNextCursor?: boolean;
  }): PaginationMeta {
    const offerNextCursor = input.offerNextCursor ?? true;
    const hasMorePages = input.pages !== undefined && input.currentPage < input.pages;
    const hasNextPage = hasMorePages || input.truncated;
    const fetchedAll = !hasNextPage && !input.hasError;

    const nextCursor =
      hasMorePages && offerNextCursor
        ? CursorCodec.encode(
            this.buildEndpoint(input.entityType, input.effectivePerPage, input.currentPage + 1),
            CURSOR_TAGS.findEntities,
            input.bodyHash
          )
        : undefined;

    return {
      hasNextPage,
      fetchedAll,
      truncated: input.truncated,
      hasError: input.hasError,
      pagesFetched: input.pagesFetched,
      perPage: input.effectivePerPage,
      ...(input.hits !== undefined ? { total: input.hits } : {}),
      ...(input.pages !== undefined ? { totalPages: input.pages } : {}),
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    };
  }

  private buildRequestBody(params: FindEntitiesDto): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (params.searchString !== undefined) body['input'] = params.searchString;
    if (params.filter !== undefined) body['filter'] = params.filter;
    if (params.orderBy !== undefined) body['orderBy'] = params.orderBy;
    if (params.orderAsc !== undefined) body['orderAsc'] = params.orderAsc;
    if (params.rootOnly !== undefined) body['rootOnly'] = params.rootOnly;
    return body;
  }

  private hashRequestBody(params: FindEntitiesDto): string {
    const json = JSON.stringify(FindEntitiesOperation.canonicalize(this.buildRequestBody(params)));
    return createHash('sha256').update(json, 'utf8').digest('base64url');
  }

  private static canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => FindEntitiesOperation.canonicalize(item));
    }
    if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(record).sort()) {
        sorted[key] = FindEntitiesOperation.canonicalize(record[key]);
      }
      return sorted;
    }
    return value;
  }

  private buildEndpoint(entityType: string, perPage: number, page: number): string {
    const query = new URLSearchParams({ perPage: String(perPage), page: String(page) });
    return `/v3/entities/${entityType}/_search?${query.toString()}`;
  }
}
