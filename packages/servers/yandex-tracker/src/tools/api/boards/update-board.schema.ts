/**
 * Zod схема для валидации параметров UpdateBoardTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

const UpdateBoardColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно'),
  statuses: z.array(z.string().min(1)).min(1, 'Нужен минимум один статус'),
});

/**
 * Фильтр доски — карта «поле задачи → значение или список значений».
 *
 * Форма снята чтением боевых досок 2026-08-25: `{"queue": ["DVIZHDEV"],
 * "resolution": ["empty()"], "type": ["task"]}`. Прежняя форма `{query}` API
 * отвергал (`422 Невозможно сохранить некорректный фильтр`) — то есть правка доски
 * с фильтром не работала вовсе. Язык запросов задаётся отдельным полем `query`,
 * не внутри фильтра.
 */
const UpdateBoardFilterSchema = z.record(
  z.string().min(1),
  z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
);

/**
 * Схема параметров для обновления доски
 */
export const UpdateBoardParamsSchema = z
  .object({
    /** Идентификатор доски (обязательно) */
    boardId: buildEntityIdSchema('Board'),

    /** Новое название доски (опционально) */
    name: z.string().min(1).optional(),

    /** Версия доски для оптимистичной блокировки (опционально) */
    version: z.number().int().positive().optional(),

    /** Обновлённые колонки доски (опционально) */
    columns: z.array(UpdateBoardColumnSchema).optional(),

    /** Обновлённый фильтр доски (опционально) */
    filter: UpdateBoardFilterSchema.optional(),

    /** Поле для сортировки задач (опционально) */
    orderBy: z.string().optional(),

    /** Порядок сортировки: true = возрастание (опционально) */
    orderAsc: z.boolean().optional(),

    /** Query string для дополнительной фильтрации (опционально) */
    query: z.string().optional(),

    /** Использовать ранжирование задач (опционально) */
    useRanking: z.boolean().optional(),

    /** ID страны для региональных настроек (опционально) */
    country: z.string().optional(),

    /** Список полей для возврата (обязательный) */
    fields: FieldsSchema,
  })
  .refine(
    (params) =>
      params.orderBy === undefined && params.orderAsc === undefined
        ? true
        : params.filter !== undefined,
    {
      message:
        'orderBy и orderAsc задают порядок внутри фильтра доски и без filter не принимаются: ' +
        'API отвечает 422 «Параметры orderBy и orderAsc нельзя указывать без параметра filter». ' +
        'Передай filter — карту «поле → значения», например {"queue": ["TEST"]}',
      path: ['orderBy'],
    }
  );

/**
 * Вывод типа из схемы
 */
export type UpdateBoardParams = z.infer<typeof UpdateBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateBoardOutputDataSchema = z.object({
  board: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateBoardOutputSchema = buildOutputSchema(UpdateBoardOutputDataSchema);
