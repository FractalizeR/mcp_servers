/**
 * Zod схемы для валидации параметра expand (расширение связанных сущностей)
 */

import { z } from 'zod';

/**
 * Допустимые значения для параметра expand
 *
 * Позволяет включить в ответ дополнительную информацию о связанных сущностях
 */
export const ExpandValueSchema = z.enum([
  'attachments', // Вложения
  'comments', // Комментарии
  'workflow', // История переходов
  'transitions', // Доступные переходы
]);

/**
 * Валидация массива expand параметров
 */
export const ExpandSchema = z
  .array(ExpandValueSchema)
  .optional()
  .describe(
    'Список связанных сущностей для включения в ответ. ' +
      'Доступные значения: attachments (вложения), comments (комментарии), ' +
      'workflow (история переходов), transitions (доступные переходы).'
  );

/**
 * Вывод типов из схем
 */
export type ExpandValue = z.infer<typeof ExpandValueSchema>;
export type Expand = z.infer<typeof ExpandSchema>;
