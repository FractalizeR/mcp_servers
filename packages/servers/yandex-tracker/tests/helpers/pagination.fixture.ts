import type { PaginatedResult } from '#tracker_api/entities/common/pagination.entity.js';

/** Полностью вычитанная страница: единственная, без продолжения. */
export function createPaginatedFixture<T>(items: T[]): PaginatedResult<T> {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
    },
  };
}
