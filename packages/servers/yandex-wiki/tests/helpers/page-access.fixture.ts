// tests/helpers/page-access.fixture.ts
import type { PageAccess } from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для PageAccess (пакет 7.2.D)
 */
export function createPageAccessFixture(overrides?: Partial<PageAccess>): PageAccess {
  return {
    id: 'access-1',
    role: 'reader',
    created_at: '2024-01-20T14:45:00.000Z',
    user: { uid: 'uid-1' },
    ...overrides,
  };
}
