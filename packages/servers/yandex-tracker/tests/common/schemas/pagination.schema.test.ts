/**
 * Unit тесты общих схем пагинации (этап 1.3)
 */

import { describe, it, expect } from 'vitest';
import {
  PageSchema,
  PerPageSchema,
  CursorSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  MAX_ITEMS_CEILING,
  MAX_TOTAL_ITEMS_CEILING,
  noPageFetchAllConflict,
  noCursorWithBulkParams,
  cursorRequiresSingleIssue,
} from '#common/schemas/pagination.schema.js';

describe('PageSchema', () => {
  it('принимает положительные целые и undefined', () => {
    expect(PageSchema.safeParse(1).success).toBe(true);
    expect(PageSchema.safeParse(undefined).success).toBe(true);
  });

  it('отклоняет 0, отрицательные и дробные', () => {
    expect(PageSchema.safeParse(0).success).toBe(false);
    expect(PageSchema.safeParse(-1).success).toBe(false);
    expect(PageSchema.safeParse(1.5).success).toBe(false);
  });
});

describe('makePerPageSchema', () => {
  it('с потолком: режет значения выше max', () => {
    const schema = makePerPageSchema(100);
    expect(schema.safeParse(100).success).toBe(true);
    expect(schema.safeParse(101).success).toBe(false);
  });

  it('без потолка: принимает большие значения (для _search)', () => {
    const schema = makePerPageSchema();
    expect(schema.safeParse(100000).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
  });

  it('PerPageSchema по умолчанию имеет потолок 100', () => {
    expect(PerPageSchema.safeParse(100).success).toBe(true);
    expect(PerPageSchema.safeParse(101).success).toBe(false);
  });
});

describe('FetchAllSchema', () => {
  it('принимает boolean и undefined', () => {
    expect(FetchAllSchema.safeParse(true).success).toBe(true);
    expect(FetchAllSchema.safeParse(false).success).toBe(true);
    expect(FetchAllSchema.safeParse(undefined).success).toBe(true);
  });

  it('отклоняет не-boolean', () => {
    expect(FetchAllSchema.safeParse('true').success).toBe(false);
  });
});

describe('MaxItemsSchema', () => {
  it('принимает значения до потолка включительно', () => {
    expect(MaxItemsSchema.safeParse(1).success).toBe(true);
    expect(MaxItemsSchema.safeParse(MAX_ITEMS_CEILING).success).toBe(true);
  });

  it('отклоняет выше потолка и не-положительные', () => {
    expect(MaxItemsSchema.safeParse(MAX_ITEMS_CEILING + 1).success).toBe(false);
    expect(MaxItemsSchema.safeParse(0).success).toBe(false);
  });
});

describe('MaxTotalItemsSchema', () => {
  it('принимает значения до потолка включительно', () => {
    expect(MaxTotalItemsSchema.safeParse(MAX_TOTAL_ITEMS_CEILING).success).toBe(true);
  });

  it('отклоняет выше потолка', () => {
    expect(MaxTotalItemsSchema.safeParse(MAX_TOTAL_ITEMS_CEILING + 1).success).toBe(false);
  });
});

describe('noPageFetchAllConflict', () => {
  it('запрещает page вместе с fetchAll=true', () => {
    expect(noPageFetchAllConflict({ page: 2, fetchAll: true })).toBe(false);
  });

  it('разрешает page без fetchAll', () => {
    expect(noPageFetchAllConflict({ page: 2 })).toBe(true);
    expect(noPageFetchAllConflict({ page: 2, fetchAll: false })).toBe(true);
  });

  it('разрешает fetchAll=true без page', () => {
    expect(noPageFetchAllConflict({ fetchAll: true })).toBe(true);
  });

  it('разрешает пустой объект', () => {
    expect(noPageFetchAllConflict({})).toBe(true);
  });
});

describe('CursorSchema', () => {
  it('принимает строку и undefined', () => {
    expect(CursorSchema.safeParse('c1:abc').success).toBe(true);
    expect(CursorSchema.safeParse(undefined).success).toBe(true);
  });

  it('отклоняет не-строку', () => {
    expect(CursorSchema.safeParse(123).success).toBe(false);
  });
});

describe('noCursorWithBulkParams', () => {
  it('разрешает курсор сам по себе', () => {
    expect(noCursorWithBulkParams({ cursor: 'c1:x' })).toBe(true);
  });

  it('разрешает любые bulk-параметры без курсора', () => {
    expect(
      noCursorWithBulkParams({ perPage: 50, fetchAll: true, maxItems: 100, maxTotalItems: 200 })
    ).toBe(true);
    expect(noCursorWithBulkParams({})).toBe(true);
  });

  it('запрещает курсор вместе с perPage', () => {
    expect(noCursorWithBulkParams({ cursor: 'c1:x', perPage: 50 })).toBe(false);
  });

  it('запрещает курсор вместе с fetchAll', () => {
    expect(noCursorWithBulkParams({ cursor: 'c1:x', fetchAll: true })).toBe(false);
  });

  it('запрещает курсор вместе с maxItems', () => {
    expect(noCursorWithBulkParams({ cursor: 'c1:x', maxItems: 100 })).toBe(false);
  });

  it('запрещает курсор вместе с maxTotalItems', () => {
    expect(noCursorWithBulkParams({ cursor: 'c1:x', maxTotalItems: 200 })).toBe(false);
  });
});

describe('cursorRequiresSingleIssue', () => {
  it('разрешает курсор при ровно одном issueId', () => {
    expect(cursorRequiresSingleIssue({ cursor: 'c1:x', issueIds: ['A-1'] })).toBe(true);
  });

  it('запрещает курсор при нескольких issueId', () => {
    expect(cursorRequiresSingleIssue({ cursor: 'c1:x', issueIds: ['A-1', 'B-2'] })).toBe(false);
  });

  it('запрещает курсор при пустом/отсутствующем issueIds', () => {
    expect(cursorRequiresSingleIssue({ cursor: 'c1:x', issueIds: [] })).toBe(false);
    expect(cursorRequiresSingleIssue({ cursor: 'c1:x' })).toBe(false);
  });

  it('разрешает любое число issueId без курсора', () => {
    expect(cursorRequiresSingleIssue({ issueIds: ['A-1', 'B-2'] })).toBe(true);
    expect(cursorRequiresSingleIssue({})).toBe(true);
  });
});
