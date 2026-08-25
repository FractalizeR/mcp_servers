/**
 * Общие Zod-фрагменты тела запроса ГЛОБАЛЬНОГО поля Трекера (create/update).
 *
 * ВАЖНО: это глобальные поля (`GET/POST/PATCH/DELETE /v3/fields`) — атрибуты
 * задач, видимые во всей организации. НЕ путать с ЛОКАЛЬНЫМИ полями очереди
 * (`#tools/api/queue-local-fields`), у которых своя схема и своя адресация
 * (короткий `key` вместо `id`). Оба семейства инструментов используют слово
 * "поле", поэтому разграничение — в названиях инструментов (`*_global_field*`
 * против `*_queue_local_field*`) и в описании каждого инструмента.
 *
 * `type` (тип поля) используется ТОЛЬКО в create — после создания тип поля
 * нельзя изменить, поэтому `UpdateFieldDto` его не содержит вовсе
 * (см. `#tracker_api/dto/field/update-field.dto.js`).
 */

import { z } from 'zod';

/** Локализованное название поля — обязательно на обоих языках (create). */
export const FieldNameValueSchema = z.object({
  en: z.string().min(1, 'Название поля на английском обязательно'),
  ru: z.string().min(1, 'Название поля на русском обязательно'),
});

/** Опция выбора для полей с фиксированным набором значений (select/multiselect). */
export const FieldOptionValueSchema = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    display: z.string().optional(),
  })
  .passthrough();

/** Провайдер опций для динамических полей (например UserProvider, QueueProvider). */
export const FieldOptionsProviderValueSchema = z
  .object({
    type: z.string().optional(),
  })
  .passthrough();
