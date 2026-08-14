/**
 * Операция получения списка пользователей организации
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка пользователей с пагинацией
 * - НЕТ получения одного/нескольких конкретных пользователей (см. GetUsersOperation)
 *
 * API: GET /v3/users (пагинация: Link rel="next", cursor)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
import type { FindUsersDto } from '#tracker_api/dto/index.js';
import type { UserWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';

export class FindUsersOperation extends BaseOperation {
  async execute(params: FindUsersDto = {}): Promise<PaginatedResult<UserWithUnknownFields>> {
    const { perPage = 50, cursor, fetchAll, maxItems } = params;

    if (cursor !== undefined) {
      const { path } = CursorCodec.decode(cursor, CURSOR_TAGS.users);
      this.logger.info('Получение списка пользователей (cursor)');
      const response = await this.httpClient.getWithResponse<UserWithUnknownFields[]>(path);
      return TrackerPaginator.singlePage<UserWithUnknownFields>(response, {
        tag: CURSOR_TAGS.users,
      });
    }

    this.logger.info(`Получение списка пользователей (perPage=${perPage})`);

    const effectivePerPage = fetchAll === true ? DEFAULT_MAX_PER_PAGE : perPage;
    const endpoint = `/v3/users?perPage=${effectivePerPage}`;

    const first = await this.httpClient.getWithResponse<UserWithUnknownFields[]>(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<UserWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.httpClient.getWithResponse<UserWithUnknownFields[]>(path),
        tag: CURSOR_TAGS.users,
        ...(maxItems !== undefined ? { maxItems } : {}),
        perPage: effectivePerPage,
        onError: (error, pagesFetched) => {
          this.logger.warn('Частичный отказ при обходе страниц пользователей', {
            pagesFetched,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      });
    }

    return TrackerPaginator.singlePage<UserWithUnknownFields>(first, {
      perPage,
      tag: CURSOR_TAGS.users,
    });
  }
}
