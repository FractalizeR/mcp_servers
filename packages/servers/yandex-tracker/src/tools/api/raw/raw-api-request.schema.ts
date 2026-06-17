/**
 * Zod схема для валидации параметров RawApiRequestTool
 *
 * Источник истины по списку методов — RAW_API_METHODS из dto/raw.
 */

import { z } from 'zod';
import { FieldsSchema } from '#common/schemas/index.js';
import { RAW_API_METHODS } from '#tracker_api/dto/index.js';

/**
 * Схема параметров прямого (raw) запроса к API Яндекс.Трекера
 */
export const RawApiRequestParamsSchema = z.object({
  /**
   * HTTP-метод. Сейчас поддерживается только GET (read-only escape hatch).
   */
  method: z
    .enum(RAW_API_METHODS)
    .describe(
      'HTTP-метод запроса. Сейчас поддерживается только GET (только чтение). ' +
        'Этот инструмент — fallback для методов API без типизированного tool; ' +
        'для существующих сущностей предпочитай специализированные инструменты.'
    ),

  /**
   * Относительный путь API, обязан начинаться с /v2/ или /v3/.
   *
   * Жёсткая валидация держит запрос на surface API Трекера:
   * - разрешён только безопасный набор символов пути ([\w.~/-]);
   * - это отсекает абсолютные URL (//, http://), а также `?`/`#` —
   *   query-параметры задаются ОТДЕЛЬНЫМ полем `query`, а не в пути;
   * - дополнительно запрещены сегменты `..` (path traversal: `/v3/../admin`).
   */
  path: z
    .string()
    .regex(
      /^\/v[23]\/[\w.~\/-]*$/,
      'Путь должен начинаться с /v2/ или /v3/ и содержать только [A-Za-z0-9_.~/-] ' +
        '(например, /v3/issues/QUEUE-1). Query-параметры передавайте через поле query.'
    )
    .refine((p) => !p.includes('..'), 'Сегменты ".." в пути запрещены')
    .describe(
      'Относительный путь API Трекера, начинается с /v2/ или /v3/. ' +
        'Только символы [A-Za-z0-9_.~/-], без query-строки. ' +
        'Например: /v3/issues/QUEUE-1 или /v2/projects.'
    ),

  /**
   * Опциональные query-параметры.
   */
  query: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .describe(
      'Query-параметры запроса, например {"expand": "transitions", "perPage": 50}. ' +
        'Массивы сериализуются через запятую (формат Трекера): ' +
        '{"expand": ["transitions", "attachments"]} → expand=transitions,attachments.'
    ),

  /**
   * Обязательный массив полей для фильтрации ответа (экономия контекста).
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type RawApiRequestParams = z.infer<typeof RawApiRequestParamsSchema>;
