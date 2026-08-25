import { describe, it, expect } from 'vitest';
import { findColumnsSharingId } from '#tracker_api/entities/index.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';

describe('findColumnsSharingId', () => {
  it('возвращает все колонки с данным id', () => {
    const columns = [
      createBoardColumnFixture({ id: 1, name: 'A' }),
      createBoardColumnFixture({ id: 1, name: 'B' }),
      createBoardColumnFixture({ id: 2, name: 'C' }),
    ];

    expect(findColumnsSharingId(columns, '1')).toHaveLength(2);
    expect(findColumnsSharingId(columns, '2')).toHaveLength(1);
    expect(findColumnsSharingId(columns, '99')).toHaveLength(0);
  });
});
