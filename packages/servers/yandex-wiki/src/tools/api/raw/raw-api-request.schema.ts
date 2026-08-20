/**
 * Zod схема для валидации параметров RawApiRequestTool (Yandex Wiki).
 *
 * Построена через фабрику createRawApiRequestSchema из @fractalizer/mcp-core:
 * - pathPattern — surface API Вики (одна версия /v1/);
 * - fieldsSchema — локальная схема фильтрации ответа (response field filter).
 *
 * ВАЖНО про fields: базовый BaseRawApiRequestTool использует поле `fields` как
 * список путей для ResponseFieldFilter (фильтрация ответа, экономия контекста),
 * который требует непустой string[]. Поэтому здесь используется
 * ResponseFieldsSchema (обязательный массив, min 1), а НЕ WikiFieldsSchema
 * (последняя — это query-параметр `fields` самого Wiki API: строка вида
 * "attributes,content", к фильтрации ответа отношения не имеющая).
 */

import { z } from 'zod';
import { createRawApiRequestSchema } from '@fractalizer/mcp-core';
import { ResponseFieldsSchema } from '#common/schemas/index.js';

/**
 * Относительный путь API Вики: всегда начинается с /v1/, далее только
 * безопасный набор символов пути [A-Za-z0-9_.~/-]. Это отсекает абсолютные URL
 * (//, http://) и query-строку (?, #) — query задаётся отдельным полем.
 */
const WIKI_RAW_PATH_PATTERN = /^\/v1\/[\w.~\/-]*$/;

/**
 * Схема параметров прямого (raw) запроса к API Яндекс.Вики.
 */
export const RawApiRequestParamsSchema = createRawApiRequestSchema({
  pathPattern: WIKI_RAW_PATH_PATTERN,
  pathExample: '/v1/pages/123',
  fieldsSchema: ResponseFieldsSchema,
});

export { WIKI_RAW_PATH_PATTERN };

/**
 * Данные успешного результата (см. BaseRawApiRequestTool.execute во framework):
 * `{ method, path, data: filtered }`. `data` — произвольный
 * JSON-ответ API Вики (форма зависит от вызванного метода), поэтому
 * `z.unknown()`.
 */
export const RawApiRequestOutputDataSchema = z.object({
  method: z.literal('GET'),
  path: z.string(),
  data: z.unknown(),
});
