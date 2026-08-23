/**
 * Фикстуры для Field entity (ГЛОБАЛЬНЫЕ поля трекера, `/v2/fields`).
 *
 * НЕ путать с `queue-field.fixture.ts` — тот про ЛОКАЛЬНЫЕ поля одной очереди
 * (`/v3/queues/{id}/localFields`, другая entity `QueueField`). Разграничение то же,
 * что у самих инструментов: `*_global_field*` против `*_queue_local_field*`
 * (см. `src/tools/api/fields/field-value.schema.ts`).
 *
 * РАСХОЖДЕНИЕ С ДОКУМЕНТАЦИЕЙ (гипотеза этапа 3.1, волна 2.1.2): официальная
 * документация `GET /v3/fields` (`api-ref/issues/get-global-fields.md`) описывает
 * `options` как БУЛЕВ флаг («есть ли у поля список опций»), а не массив опций;
 * там же есть поля, которых нет в `Field`/`FieldWithUnknownFields` вовсе —
 * `key`, `version`, `suggestProvider`, `queryProvider`, `order`, `category`,
 * `type`. Эта фикстура намеренно НЕ заведена под документированную форму — она
 * фиксирует то, что реально возвращает наблюдаемый код (`v2`, `Field` entity,
 * `readonly boolean`/без `options`), а не документированный `v3`. Не подгонять
 * под документацию явочным путём — это работа этапа 3.1, не побочный эффект
 * правки теста.
 */

import type { Field, FieldWithUnknownFields } from '../../src/tracker_api/entities/field.entity.js';

/**
 * Создать Field (глобальное поле) для тестов.
 *
 * @example
 * ```typescript
 * const field = createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' });
 * ```
 */
export function createGlobalFieldFixture(overrides?: Partial<Field>): FieldWithUnknownFields {
  const id = overrides?.id ?? 'customField123';

  return {
    id,
    self: `https://api.tracker.yandex.net/v2/fields/${id}`,
    name: 'Custom Priority',
    description: 'Priority level defined by the customer',
    schema: { type: 'string' },
    readonly: false,
    suggest: false,
    ...overrides,
  };
}
