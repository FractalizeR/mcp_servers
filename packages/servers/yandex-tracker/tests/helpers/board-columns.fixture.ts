/**
 * Фикстура колонки доски (`GET/POST/PATCH /v3/boards/{boardId}/columns`).
 *
 * До 4.1/пакета B `id` колонки в entity `BoardColumn` был типизирован как
 * `string`, тогда как боевой `GET` отдавал число (`"id": 5`) — это расхождение
 * исправлено там же (`src/tracker_api/entities/board.entity.ts`), эта
 * фикстура больше не нуждается в отдельном "документированном" типе и
 * использует `BoardColumn` напрямую.
 *
 * Второе расхождение НЕ закрыто: боевой `GET` отдаёт у колонки `self`
 * (`"self": "https://api.tracker.yandex.net/v3/boards/73/columns/5"`), а
 * `BoardColumn` это поле не объявляет — гипотеза этапа 3.1. Данные не
 * теряются в рантайме (`WithUnknownFields` пропускает `self` как unknown), но
 * оно остаётся неучтённым в типе. Фикстура ниже задаёт `self`, чтобы
 * расхождение оставалось видимым в тестах.
 *
 * НЕ путать с `agile.fixture.ts` — там фикстуры Board и Sprint целиком (`/v3/boards`,
 * `/v3/sprints`), здесь — только вложенная колонка доски (`/v3/boards/{id}/columns`).
 */

import type { BoardColumn } from '#tracker_api/entities/board.entity.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

export function createBoardColumnFixture(
  overrides?: Partial<BoardColumn> & Record<string, unknown>
): WithUnknownFields<BoardColumn> {
  const id = overrides?.id ?? 1;
  return {
    self: `https://api.tracker.yandex.net/v3/boards/1/columns/${String(id)}`,
    id,
    name: 'Test Column',
    statuses: [{ id: '1', key: 'open', display: 'Open' }],
    ...overrides,
  };
}
