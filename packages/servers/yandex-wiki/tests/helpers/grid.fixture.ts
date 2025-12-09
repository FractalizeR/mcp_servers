// tests/helpers/grid.fixture.ts
import type { Grid, GridWithUnknownFields } from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для Grid
 */
export function createGridFixture(overrides?: Partial<Grid>): GridWithUnknownFields {
  return {
    created_at: '2024-01-15T10:30:00.000Z',
    title: 'Test Grid',
    page: {
      id: 12345,
      slug: 'users/testuser/test-grid',
    },
    revision: 'rev-123',
    rich_text_format: 'yfm',
    structure: {
      columns: [
        {
          id: 'col-1',
          title: 'Name',
          slug: 'name',
          type: 'string',
          required: true,
          width: 200,
          width_units: 'px',
        },
        {
          id: 'col-2',
          title: 'Status',
          slug: 'status',
          type: 'select',
          required: false,
          select_options: ['Open', 'In Progress', 'Done'],
        },
      ],
      default_sort: [
        {
          column_slug: 'name',
          direction: 'asc',
        },
      ],
    },
    rows: [
      {
        id: 'row-1',
        row: ['Test Item 1', 'Open'],
        pinned: false,
      },
      {
        id: 'row-2',
        row: ['Test Item 2', 'Done'],
        pinned: false,
      },
    ],
    attributes: {
      created_at: '2024-01-15T10:30:00.000Z',
      modified_at: '2024-01-20T14:45:00.000Z',
    },
    ...overrides,
  };
}

/**
 * Создать фикстуру для DeleteGridResult
 */
export function createDeleteGridResultFixture(): { recovery_token: string } {
  return {
    recovery_token: 'grid-recovery-token-xyz789',
  };
}
