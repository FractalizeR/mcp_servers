/**
 * Общая Zod схема одного Key Result'а для add/set Key Results инструментов
 */

import { z } from 'zod';

export const KeyResultItemInputSchema = z.object({
  /** Тип key result'а: завершение (binary) или измеряемая метрика (value) */
  type: z.enum(['binary', 'value']),

  /** Текст key result'а */
  text: z.string().min(1, 'Текст key result обязателен'),

  /** Исполнитель (login/uid, опционально) */
  assignee: z.string().optional(),

  /** Дедлайн в формате YYYY-MM-DD (опционально) */
  deadline: z.string().optional(),

  /** Прогресс — для type='value' (опционально) */
  progress: z
    .object({
      start: z.number(),
      end: z.number(),
      current: z.number().optional(),
    })
    .optional(),

  /** Признак завершения — для type='binary' (опционально) */
  achieved: z.boolean().optional(),
});

export type KeyResultItemInput = z.infer<typeof KeyResultItemInputSchema>;
