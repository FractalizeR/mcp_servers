/**
 * Zod схема для валидации параметров CreateBoardTool
 *
 * Форма соответствует `POST /v3/liveBoards/` (0_CONTRACTS.md, D9): `POST /v3/boards`
 * объявлен устаревшим и молча игнорирует тело запроса.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Колонка доски, привязанная к статусам
 */
const CreateBoardColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно'),
  statuses: z
    .array(z.string().min(1))
    .min(1, 'Нужен минимум один статус')
    .describe('Ключи статусов задач, попадающих в колонку — справочник get_statuses'),
  limit: z.number().int().positive().optional(),
});

/**
 * Бэклог-/непараметризованная колонка (без привязки к статусам)
 */
const CreateBoardBacklogColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно'),
  limit: z.number().int().positive().optional(),
});

/**
 * Схема параметров для создания доски
 */
export const CreateBoardParamsSchema = z.object({
  /** Название доски (обязательно) */
  name: z.string().min(1, 'Название доски обязательно'),

  /**
   * Ключ очереди, к которой привязывается доска (опционально). Отображается в
   * `autoFilters.addFilter.liveFilter.fieldValues.queue` — очередь не является
   * полем верхнего уровня тела `POST /v3/liveBoards/`.
   */
  queue: z
    .string()
    .optional()
    .describe(
      'Ключ очереди (не ID) — справочник get_queues, поле key. Уходит в тело как ' +
        'autoFilters.addFilter.liveFilter.fieldValues.queue'
    ),

  /** Логин/uid владельца доски (опционально) */
  owner: z.string().optional(),

  /** Шаблон прав доступа: приватная или публичная доска (опционально) */
  boardPermissionsTemplate: z
    .enum(['private', 'public'])
    .optional()
    .describe('Права доступа к доске: private — приватная, public — публичная (по умолчанию)'),

  /** Доступность бэклога на доске (опционально) */
  backlogAvailable: z.boolean().optional(),

  /** Доступность спринтов на доске (опционально; без него спринт на доске не завести) */
  sprintsAvailable: z.boolean().optional(),

  /** Колонки доски, привязанные к статусам (опционально) */
  columns: z.array(CreateBoardColumnSchema).optional(),

  /** Колонки бэклога (опционально) */
  backlogColumns: z.array(CreateBoardBacklogColumnSchema).optional(),

  /** Непараметризованные колонки (опционально) */
  nonParametrizedColumns: z.array(CreateBoardBacklogColumnSchema).optional(),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateBoardParams = z.infer<typeof CreateBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const CreateBoardOutputDataSchema = z.object({
  board: FilteredEntitySchema,
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateBoardOutputSchema = buildOutputSchema(CreateBoardOutputDataSchema);
