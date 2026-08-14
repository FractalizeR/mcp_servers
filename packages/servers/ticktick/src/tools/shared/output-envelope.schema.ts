/**
 * Хелпер для построения outputSchema (JSON Schema 2020-12) из Zod-схемы
 * "успешного" payload инструмента.
 *
 * Контракт пакета 3.1.B (`base-tool.ts`): `formatSuccess(data)` отдаёт
 * `{ success: true, data }` и как `structuredContent`, и как JSON-текст.
 * `outputSchema` инструмента обязан описывать ИМЕННО эту обёртку, а не
 * голый `data` — см. `SuccessEnvelope` в base-tool.ts.
 *
 * Описывается только success-ветка: при ошибке `formatError()` возвращает
 * `{ success: false, message, error? }` с `isError: true`, и MCP-клиенты не
 * обязаны валидировать structuredContent по outputSchema в этом случае
 * (outputSchema документирует форму УСПЕШНОГО результата).
 *
 * Верхний уровень обёртки строгий (additionalProperties: false — только
 * success/data), но вложенные объекты (например, поле data.task) остаются
 * permissive: `zodToMcpInputSchema` проставляет additionalProperties только
 * на самом верхнем уровне переданной схемы, вложенные z.object() из
 * z.toJSONSchema приходят без этого поля (== разрешены доп. свойства) —
 * проверено эмпирически, что соответствует entity-схемам TickTick
 * (`TaskWithUnknownFields`/`ProjectWithUnknownFields` допускают
 * недокументированные поля API).
 */

import { z } from 'zod';
import { zodToMcpInputSchema } from '@fractalizer/mcp-core';
import type { JsonObjectSchema } from '@fractalizer/mcp-core';

/**
 * Построить outputSchema для успешного результата инструмента.
 *
 * @param dataShape - Zod-схема поля `data` envelope (z.object({ ... }))
 */
export function buildSuccessOutputSchema<Shape extends z.ZodRawShape>(
  dataShape: z.ZodObject<Shape>
): JsonObjectSchema {
  const envelope = z.object({
    success: z.literal(true),
    data: dataShape,
  });

  return zodToMcpInputSchema(envelope);
}
