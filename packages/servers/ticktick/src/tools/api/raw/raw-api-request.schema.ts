/**
 * Zod схема для валидации параметров RawApiRequestTool (TickTick)
 *
 * Строится через core-фабрику createRawApiRequestSchema с TickTick-специфичными
 * path-паттерном и локальной FieldsSchema.
 *
 * Путь — БЕЗ версии (/project/...): baseURL уже содержит /open/v1.
 * Жёсткая валидация держит запрос на surface API TickTick:
 * - разрешён только безопасный набор символов пути ([\w.~/-]);
 * - это отсекает абсолютные URL (http://, //), а также `?`/`#`/пробелы —
 *   query-параметры задаются ОТДЕЛЬНЫМ полем `query`, а не в пути;
 * - дополнительно core-фабрика запрещает сегменты `..` (path traversal).
 */

import { createRawApiRequestSchema } from '@fractalizer/mcp-core';
import { FieldsSchema } from '#common/schemas/index.js';

/**
 * Паттерн пути TickTick. Версия (/open/v1) уже в baseURL — путь без неё.
 * Требует хотя бы один символ после ведущего слеша (пустой путь запрещён).
 */
export const TICKTICK_RAW_API_PATH_PATTERN = /^\/[\w.~\/-]+$/;

/**
 * Схема параметров прямого (raw) запроса к API TickTick.
 */
export const RawApiRequestParamsSchema = createRawApiRequestSchema({
  pathPattern: TICKTICK_RAW_API_PATH_PATTERN,
  pathExample: '/project/{projectId}/data',
  fieldsSchema: FieldsSchema,
});
