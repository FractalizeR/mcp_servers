/**
 * Фикстура колонки доски (`GET/POST/PATCH /v3/boards/{boardId}/columns`).
 *
 * Форма — документированная wire-форма API, а не наша entity `BoardColumn`
 * (`src/tracker_api/entities/board.entity.ts`). Официальная документация Трекера
 * (Yandex Cloud Docs, страницы `get-board` и `post-column`, снято 2026-08-23)
 * показывает `id` колонки ЧИСЛОМ (`"id": 5`) и присутствующий `self`
 * (`"self": "https://api.tracker.yandex.net/v3/boards/73/columns/5"`), тогда как
 * локальная entity типизирует `id: string` и вовсе не знает про `self` у колонки.
 * Это РАСХОЖДЕНИЕ, найденное ревью волны 2.1.2 (гипотеза этапа 3.1, `src/` этим
 * пакетом не правится). Фикстура намеренно НЕ подгоняется под неверный тип entity
 * (`id: string`) — иначе расхождение осталось бы невидимым в тестах; тип фикстуры
 * — отдельный `DocumentedBoardColumn`, а не импорт `BoardColumn`.
 *
 * `id` в overrides принимает и `number` (документированная форма, дефолт), и
 * `string` — вызовы `create-board-column`/`update-board-column.tool.integration.test.ts`
 * передают `id` как эхо переданного `columnId` (строка), эти файлы вне набора
 * данного пакета правок.
 *
 * НЕ путать с `agile.fixture.ts` — там фикстуры Board и Sprint целиком (`/v2/boards`,
 * `/v2/sprints`), здесь — только вложенная колонка доски (`/v3/boards/{id}/columns`).
 */

import type { WithUnknownFields } from '#tracker_api/entities/types.js';

interface DocumentedBoardColumnStatus {
  readonly id: string;
  readonly key: string;
  readonly display: string;
}

interface DocumentedBoardColumn {
  readonly self: string;
  readonly id: number | string;
  readonly name: string;
  readonly statuses?: ReadonlyArray<DocumentedBoardColumnStatus>;
}

export function createBoardColumnFixture(
  overrides?: Partial<DocumentedBoardColumn> & Record<string, unknown>
): WithUnknownFields<DocumentedBoardColumn> {
  const id = overrides?.id ?? 1;
  return {
    self: `https://api.tracker.yandex.net/v3/boards/1/columns/${String(id)}`,
    id,
    name: 'Test Column',
    statuses: [{ id: '1', key: 'open', display: 'Open' }],
    ...overrides,
  };
}
