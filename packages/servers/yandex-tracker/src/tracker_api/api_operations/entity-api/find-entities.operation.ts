/**
 * Операция поиска/списка записей Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО поиск записей заданного entityType по критериям
 * - Отправка POST запроса на /v3/entities/{entityType}/_search
 * - Пагинация результатов (cursor по `Link rel="next"`)
 * - НЕТ получения/создания/обновления/удаления одной записи
 *
 * API: POST /v3/entities/{entityType}/_search
 *
 * Пагинация (opaque-cursor с хешем тела, тот же R2-паттерн, что и
 * find_issues — см. `find-issues.operation.ts`): курсор кодирует next-путь +
 * хеш канонического тела; при возобновлении критерии передаются повторно и
 * сверяются с хешем. Упрощение относительно find_issues: нет fallback-обхода
 * по номерам страниц при отсутствии `Link` — только single-page в этом
 * случае (Entity API — новая, менее исхоженная область; такой fallback
 * добавляется по факту наблюдения, если понадобится).
 */

import { createHash } from 'node:crypto';

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  CursorCodec,
  CURSOR_TAGS,
  DEFAULT_MAX_PER_PAGE,
} from '#tracker_api/utils/index.js';
import type { FindEntitiesDto } from '#tracker_api/dto/entity-api/index.js';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export type FindEntitiesResult = PaginatedResult<EntityApiRecordWithUnknownFields>;

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
    const effectivePerPage =
      params.fetchAll === true ? (params.perPage ?? DEFAULT_MAX_PER_PAGE) : params.perPage;
    const endpoint = this.buildEndpoint(params.entityType, effectivePerPage);

    // idempotencyDeclared: true — POST `_search` только читает.
    const first = await this.httpClient.postWithResponse<EntityApiRecordWithUnknownFields[]>(
      endpoint,
      requestBody,
      undefined,
      true
    );

    if (params.fetchAll !== true) {
      return TrackerPaginator.singlePage(first, {
        tag: CURSOR_TAGS.findEntities,
        cursorExtra: bodyHash,
        ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      });
    }

    return TrackerPaginator.fetchAllPages({
      firstResponse: first,
      requestNext: (path) =>
        this.httpClient.postWithResponse<EntityApiRecordWithUnknownFields[]>(
          path,
          requestBody,
          undefined,
          true
        ),
      tag: CURSOR_TAGS.findEntities,
      cursorExtra: bodyHash,
      ...(params.maxItems !== undefined ? { maxItems: params.maxItems } : {}),
      ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      onError: (error, pagesFetched) =>
        this.logger.warn('Частичный отказ при обходе страниц поиска Entity API', {
          error,
          pagesFetched,
        }),
    });
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

    const resp = await this.httpClient.postWithResponse<EntityApiRecordWithUnknownFields[]>(
      path,
      requestBody,
      undefined,
      true
    );

    return TrackerPaginator.singlePage(resp, {
      tag: CURSOR_TAGS.findEntities,
      cursorExtra: bodyHash,
    });
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

  private buildEndpoint(entityType: string, perPage: number | undefined): string {
    const query = perPage !== undefined ? `?perPage=${encodeURIComponent(String(perPage))}` : '';
    return `/v3/entities/${entityType}/_search${query}`;
  }
}
