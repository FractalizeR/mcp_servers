/**
 * Zod схема для валидации параметров ManageQueueAccessTool
 *
 * Документированная форма тела (api-ref/queues/manage-access, раздел «Параметры
 * тела запроса»): `{ <разрешение>: { users|groups|roles: [...] | { add|remove: [...] } } }`.
 * Прежняя схема шла ролями `queue-lead`/`team-member`/`follower`/`access` верхним
 * ключом тела — ни одна роль разрешением не является, живая проба 2026-08-26 дала
 * `400 <роль>: Incorrect data format` на каждой из четырёх.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/** Разрешение — единственный ключ верхнего уровня тела запроса. */
const QUEUE_ACCESS_PERMISSIONS = ['create', 'write', 'read', 'grant', 'deny'] as const;

/** Вид субъекта: пользователь, группа (числовой id) или встроенная роль задачи. */
const QUEUE_ACCESS_SUBJECT_KINDS = ['users', 'groups', 'roles'] as const;

/**
 * Встроенные роли задачи, доступные как субъект (`subjectKind: 'roles'`).
 * `queue-lead` сюда не входит: документация «Допустимые идентификаторы» не
 * объявляет его назначаемой ролью — он встречается только в примерах ответов.
 */
const QUEUE_ACCESS_ROLE_SUBJECTS = ['author', 'assignee', 'follower', 'access'] as const;

/**
 * Схема параметров для управления доступом к очереди.
 *
 * Форма «одно разрешение × один вид субъекта × одно действие за запрос» — осознанное
 * сужение документированной мультиформы (несколько разрешений в одном теле, а также
 * форма-замена `users: [...]` без `add`/`remove`). Причина сужения — предсказуемость
 * инструмента для агента: один вызов производит один понятный эффект, а не набор
 * параллельных изменений, которые придётся распутывать по ответу.
 */
export const ManageQueueAccessParamsSchema = z
  .object({
    /**
     * Идентификатор или ключ очереди (обязательно)
     */
    queueId: z.string().min(1, 'Queue ID не может быть пустым'),

    /**
     * Разрешение, которым управляем (обязательно)
     */
    permission: z.enum(QUEUE_ACCESS_PERMISSIONS),

    /**
     * Вид субъекта: пользователи, группы (числовой id) или роли задачи (обязательно)
     */
    subjectKind: z.enum(QUEUE_ACCESS_SUBJECT_KINDS),

    /**
     * Действие (обязательно)
     */
    action: z.enum(['add', 'remove']),

    /**
     * Субъекты: логины/uid пользователей, ЧИСЛОВЫЕ id групп либо идентификаторы ролей
     * (обязательно)
     */
    subjects: z
      .array(z.union([z.string().min(1), z.number()]))
      .min(1, 'Subjects не может быть пустым'),

    /**
     * Список полей для возврата (обязательно)
     */
    fields: FieldsSchema,
  })
  .refine((data) => !(data.permission === 'deny' && data.subjectKind === 'roles'), {
    message:
      'Для разрешения deny доступны только subjectKind users и groups — роли запретить нельзя',
    path: ['subjectKind'],
  })
  .refine(
    (data) => data.subjectKind !== 'groups' || data.subjects.every((s) => typeof s === 'number'),
    {
      message: 'При subjectKind groups каждый субъект обязан быть числовым id группы',
      path: ['subjects'],
    }
  )
  .refine(
    (data) =>
      data.subjectKind !== 'roles' ||
      data.subjects.every(
        (s) =>
          typeof s === 'string' && (QUEUE_ACCESS_ROLE_SUBJECTS as readonly string[]).includes(s)
      ),
    {
      message: `При subjectKind roles каждый субъект обязан быть одной из ролей: ${QUEUE_ACCESS_ROLE_SUBJECTS.join(', ')}`,
      path: ['subjects'],
    }
  );

/**
 * Вывод типа из схемы
 */
export type ManageQueueAccessParams = z.infer<typeof ManageQueueAccessParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * `permissions` — форма ответа `GET/PATCH /v3/queues/{queueId}/permissions`, снятая
 * живой пробой 2026-08-26: объект, ключёванный разрешением (`{self, version, create?,
 * write?, read?, grant?, deny?}`), а НЕ массив — прежняя типизация
 * (`z.array(FilteredEntitySchema)`) отвергалась MCP-клиентом на границе схемы
 * (`data/data/permissions must be array`). `permissions` проходит через тот же
 * `ResponseFieldFilter`, что и остальные отфильтрованные сущности, поэтому её
 * конкретный набор ключей после фильтрации по-прежнему зависит от параметра
 * `fields` — отсюда тот же `FilteredEntitySchema` (запись `string → unknown`), а не
 * жёстко описанная вложенная форма.
 *
 * `subjectsSent` — количество субъектов, ОТПРАВЛЕННЫХ в теле запроса, а не
 * применённых API: живая проба 2026-08-26 показала, что `permission: 'read'`
 * принимается с 200 и не меняет состав доступов и версию очереди вовсе — API
 * может принять запрос и не применить его. Имя поля обязано говорить об
 * отправленном, а не о неподтверждённо применённом.
 */
export const ManageQueueAccessOutputDataSchema = z.object({
  queueId: z.string(),
  permission: z.enum(QUEUE_ACCESS_PERMISSIONS),
  subjectKind: z.enum(QUEUE_ACCESS_SUBJECT_KINDS),
  action: z.enum(['add', 'remove']),
  subjectsSent: z.number(),
  permissions: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const ManageQueueAccessOutputSchema = buildOutputSchema(ManageQueueAccessOutputDataSchema);
