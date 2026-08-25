/**
 * Фикстуры для Field entity (ГЛОБАЛЬНЫЕ поля трекера, `/v3/fields`).
 *
 * НЕ путать с `queue-field.fixture.ts` — тот про ЛОКАЛЬНЫЕ поля одной очереди
 * (`/v3/queues/{id}/localFields`, другая entity `QueueField`). Разграничение то же,
 * что у самих инструментов: `*_global_field*` против `*_queue_local_field*`
 * (см. `src/tools/api/fields/field-value.schema.ts`).
 *
 * `options` в `Field` (§4.1 плана миграции v3, пакет B) типизирован как булев
 * флаг («есть ли у поля список опций»), а не массив опций — исправлено вместе
 * с entity, эта фикстура матчит текущий тип напрямую. Документация `GET
 * /v3/fields` (`api-ref/issues/get-global-fields.md`) также называет поля,
 * которых нет в `Field`/`FieldWithUnknownFields` вовсе — `key`, `version`,
 * `suggestProvider`, `queryProvider`, `order`, `category`, `type`; это остаётся
 * гипотезой этапа 3.1 и пакетом B не закрывается.
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
    self: `https://api.tracker.yandex.net/v3/fields/${id}`,
    name: 'Custom Priority',
    description: 'Priority level defined by the customer',
    schema: { type: 'string' },
    readonly: false,
    suggest: false,
    ...overrides,
  };
}
