/**
 * Фабрика Zod-схемы для raw-API-passthrough инструментов.
 *
 * Path-паттерн и fields-схема параметризуются, т.к. различаются между серверами
 * (у каждого свой surface API и своя локальная FieldsSchema).
 */

import { z } from 'zod';
import { RAW_API_METHODS } from './raw-api.types.js';

/**
 * Опции фабрики схемы raw-запроса.
 */
export interface CreateRawApiRequestSchemaOptions {
  /** Regex валидации пути (server-specific surface API), напр. `^/v[23]/[\w.~/-]*$` */
  pathPattern: RegExp;
  /** Пример пути для сообщения об ошибке и описания */
  pathExample: string;
  /** Локальная FieldsSchema сервера (для консистентности с остальными его tools) */
  fieldsSchema: z.ZodType<string[]>;
}

/**
 * Создаёт Zod-схему параметров raw-запроса.
 *
 * Жёсткая валидация пути: только переданный паттерн, плюс запрет сегментов `..`
 * (path traversal). Паттерн должен исключать абсолютные URL, `?`/`#` и спецсимволы
 * (query задаётся отдельным полем).
 */
export function createRawApiRequestSchema(
  opts: CreateRawApiRequestSchemaOptions
): z.ZodObject<z.ZodRawShape> {
  return z.object({
    method: z
      .enum(RAW_API_METHODS)
      .describe(
        'HTTP-метод запроса. Сейчас поддерживается только GET (только чтение). ' +
          'Этот инструмент — fallback для методов API без типизированного tool; ' +
          'для существующих сущностей предпочитай специализированные инструменты.'
      ),
    path: z
      .string()
      .regex(
        opts.pathPattern,
        `Недопустимый путь. Пример валидного: ${opts.pathExample}. ` +
          'Query-параметры передавайте через поле query, а не в пути.'
      )
      // Протокол-относительные URL (//host) axios трактует как абсолютные и уводят
      // запрос с baseURL на чужой хост (SSRF + утечка токена). Запрещаем
      // централизованно для всех серверов — даже если их pathPattern это пропустит.
      .refine((p) => !p.startsWith('//'), 'Протокол-относительные URL (//host) запрещены')
      .refine((p) => !p.includes('..'), 'Сегменты ".." в пути запрещены')
      .describe(
        `Относительный путь API (например, ${opts.pathExample}). ` +
          'Без абсолютных/протокол-относительных URL, query-строки и спецсимволов.'
      ),
    query: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
      .optional()
      .describe(
        'Query-параметры запроса, например {"perPage": 50}. ' +
          'Массивы сериализуются через запятую: {"expand": ["a", "b"]} → expand=a,b.'
      ),
    fields: opts.fieldsSchema,
  });
}
