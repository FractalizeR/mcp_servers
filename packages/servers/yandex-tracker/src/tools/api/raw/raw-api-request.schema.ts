/**
 * Zod схема для валидации параметров RawApiRequestTool
 *
 * Схема строится через фабрику createRawApiRequestSchema из @fractalizer/mcp-core
 * (generic raw-API-passthrough). Tracker задаёт свой path-паттерн (/v2/ и /v3/)
 * и локальную FieldsSchema. Источник истины по списку методов — RAW_API_METHODS
 * из core.
 */

import { z } from 'zod';
import { createRawApiRequestSchema } from '@fractalizer/mcp-core';
import { FieldsSchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров прямого (raw) запроса к API Яндекс.Трекера.
 *
 * Path-паттерн `^/v[23]/[\w.~/-]*$` держит запрос на surface API Трекера:
 * - путь обязан начинаться с /v2/ или /v3/;
 * - разрешён только безопасный набор символов пути ([\w.~/-]);
 * - это отсекает абсолютные URL (//, http://), а также `?`/`#`;
 * - сегменты `..` (path traversal) запрещаются фабрикой дополнительно.
 */
export const RawApiRequestParamsSchema = createRawApiRequestSchema({
  pathPattern: /^\/v[23]\/[\w.~\/-]*$/,
  pathExample: '/v3/issues/QUEUE-1',
  fieldsSchema: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type RawApiRequestParams = z.infer<typeof RawApiRequestParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * Форма зеркалирует `BaseRawApiRequestTool.execute()` (framework,
 * `packages/framework/core/src/tools/raw/base-raw-api-request.tool.ts`):
 * `data` — сырой (отфильтрованный по `fields`, если применимо) ответ API,
 * форма которого заранее не известна (объект/массив/скаляр — see комментарий
 * про ResponseFieldFilter в base-raw-api-request.tool.ts), поэтому `unknown`.
 */
export const RawApiRequestOutputDataSchema = z.object({
  method: z.literal('GET'),
  path: z.string(),
  data: z.unknown(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const RawApiRequestOutputSchema = buildOutputSchema(RawApiRequestOutputDataSchema);
