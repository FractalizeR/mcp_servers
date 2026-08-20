/**
 * Zod схемы для валидации идентификаторов задач Яндекс.Трекера
 */

import { z } from 'zod';

/**
 * Ключ задачи в формате очередь-номер (PROJ-123, ABC-456, TEST-1).
 */
const IssueKeyFormatSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]+-\d+$/)
  .describe('Ключ задачи в формате PROJ-123');

/**
 * Внутренний id задачи — 24-символьный hex (`^[0-9a-f]{24}$`). План
 * `plan_tool_contract_unification`, README §1.1 (ревизия 3): живой замер 19
 * задач очереди TEST — id задачи, чек-листа, записи changelog и bulk-операции
 * ВСЕ строго этой формы; доступ по внутреннему id подтверждён (GET
 * /v3/issues/{id} и вложенный /comments). Пиннинг заменил более раннее
 * решение «непрозрачная непустая строка» — та формулировка делала валидацию
 * фактически пустой (любая строка проходила), и опечатка вроде 'invalid-key'
 * ловилась только поздним 404 с сервера, а не ранней понятной ошибкой.
 */
const IssueOpaqueIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/)
  .describe('Внутренний id задачи (24-символьный hex)');

/**
 * Идентификатор задачи Яндекс.Трекера: ключ (PROJ-123) ИЛИ внутренний id
 * (24-символьный hex). Принимает больше, чем звучит имя из словаря API
 * (`<issue-id>`), чтобы не отвергать валидные вызовы, зеркалирующие реальный
 * ответ API (см. README плана `plan_tool_contract_unification`, таблица
 * решений).
 */
export const IssueKeySchema = z
  .union([IssueKeyFormatSchema, IssueOpaqueIdSchema], {
    error: () =>
      'Идентификатор задачи должен быть либо ключом в формате PROJ-123, ' +
      'либо внутренним id — 24-символьной hex-строкой',
  })
  .describe('Идентификатор задачи: ключ (PROJ-123) или внутренний id (24-символьный hex)');

/**
 * Валидация массива ключей задач
 */
export const IssueKeysSchema = z
  .array(IssueKeySchema)
  .min(1, 'Необходимо указать хотя бы один ключ задачи')
  .describe('Массив ключей задач');

/**
 * Вывод типа из схемы
 */
export type IssueKey = z.infer<typeof IssueKeySchema>;
export type IssueKeys = z.infer<typeof IssueKeysSchema>;
