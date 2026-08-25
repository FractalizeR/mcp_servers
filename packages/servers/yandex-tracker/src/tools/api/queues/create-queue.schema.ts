/**
 * Zod схема для валидации параметров CreateQueueTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для создания очереди
 */
export const CreateQueueParamsSchema = z.object({
  /**
   * Уникальный ключ очереди (обязательно)
   */
  key: z.string().regex(/^[A-Z]{2,10}$/, 'Ключ очереди должен быть A-Z, 2-10 символов'),

  /**
   * Название очереди (обязательно, лимит найден живым прогоном API)
   */
  name: z
    .string()
    .min(1, 'Name не может быть пустым')
    .max(40, 'Name не может быть длиннее 40 символов'),

  /**
   * ID или login руководителя (обязательно)
   */
  lead: z.string().min(1, 'Lead не может быть пустым'),

  /**
   * ID типа задачи по умолчанию (обязательно)
   */
  defaultType: z.string().min(1, 'DefaultType не может быть пустым'),

  /**
   * ID приоритета по умолчанию (обязательно)
   */
  defaultPriority: z.string().min(1, 'DefaultPriority не может быть пустым'),

  /**
   * Конфигурация воркфлоу и резолюций по типам задач (обязательно для API)
   */
  issueTypesConfig: z
    .array(
      z.object({
        issueType: z.string().min(1).describe('ID типа задачи — справочник get_issue_types'),
        workflow: z
          .string()
          .min(1)
          .describe(
            'ID воркфлоу организации — справочник raw_api_request GET /v3/workflows (пресеты и собственные W1..WN)'
          ),
        resolutions: z
          .array(z.string().min(1))
          .min(1)
          .describe('Ключи резолюций — справочник get_resolutions'),
      })
    )
    .min(
      1,
      'issueTypesConfig обязателен: API отклоняет запрос без него. Возьми workflow из raw_api_request GET /v3/workflows, issueType из get_issue_types, resolutions из get_resolutions'
    ),

  /**
   * Описание очереди (опционально)
   */
  description: z.string().optional(),

  /**
   * Массив ID доступных типов задач (опционально)
   */
  issueTypes: z.array(z.string()).optional(),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateQueueParams = z.infer<typeof CreateQueueParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const CreateQueueOutputDataSchema = z.object({
  queueKey: z.string(),
  queue: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateQueueOutputSchema = buildOutputSchema(CreateQueueOutputDataSchema);
