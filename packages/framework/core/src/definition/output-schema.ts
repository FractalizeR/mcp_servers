/**
 * Единый хелпер построения outputSchema для success envelope инструмента.
 *
 * Контракт пакета 3.1.B (`base-tool.ts`): `formatSuccess(data)` отдаёт
 * `{ success: true, data }` и как `structuredContent`, и как JSON-текст в
 * `content[0].text`. `outputSchema` инструмента обязан описывать ИМЕННО эту
 * обёртку, а не голый `data` — см. `SuccessEnvelope` в base-tool.ts.
 *
 * Пакет 3.1.G: до этого пакета три сервера (Трекер, Вики, TickTick),
 * работая параллельно и без права трогать framework, независимо изобрели
 * один и тот же хелпер под тремя разными именами в трёх разных пакетах
 * (`#common/schemas/output.schema.ts`, `tools/shared/tool-definition-extras.ts`,
 * `tools/shared/output-envelope.schema.ts`). Совпадение способа — признак
 * недостающей проекции во framework, а не вкуса исполнителя. Здесь —
 * единственная реализация; серверные копии удалены/сведены к ре-экспорту.
 *
 * Описывается только success-ветка: при ошибке `formatError()` возвращает
 * `{ success: false, message, error? }` с `isError: true`, и outputSchema
 * документирует форму УСПЕШНОГО результата (клиенты не обязаны валидировать
 * structuredContent по outputSchema в error-ветке).
 */

import { z } from 'zod';
import { generateDefinitionFromSchema } from './schema-to-definition.js';
import type { JsonObjectSchema } from '../tools/base/base.types.js';

/**
 * Обернуть Zod-схему данных инструмента в единый success envelope
 * `{ success: true, data }` — форма, в которой `BaseTool.formatSuccess()`
 * отдаёт и `structuredContent`, и текстовый дубль.
 */
export function successEnvelopeSchema<T extends z.ZodRawShape>(
  dataSchema: z.ZodObject<T>
): z.ZodObject<{ success: z.ZodLiteral<true>; data: z.ZodObject<T> }> {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/**
 * Собрать `outputSchema` (JSON Schema 2020-12) инструмента из Zod-схемы данных.
 *
 * Оборачивает `dataSchema` в success envelope и прогоняет через тот же генератор,
 * что и `inputSchema` (`generateDefinitionFromSchema`) — гарантирует одинаковый
 * диалект/структуру ($defs, additionalProperties и т.д.) для input и output.
 *
 * Верхний уровень обёртки строгий (`additionalProperties: false` — только
 * `success`/`data`); вложенные объекты внутри `dataSchema` сохраняют ту
 * permissive/strict форму, которую задал сам вызывающий (см. `generateDefinitionFromSchema`).
 */
export function buildOutputSchema<T extends z.ZodRawShape>(
  dataSchema: z.ZodObject<T>
): JsonObjectSchema {
  return generateDefinitionFromSchema(successEnvelopeSchema(dataSchema)) as JsonObjectSchema;
}
