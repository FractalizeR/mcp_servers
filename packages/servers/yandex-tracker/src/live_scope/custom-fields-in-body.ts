/**
 * Пользовательские поля в мутирующем теле задачи и массовой операции.
 *
 * Гейт ссылок на людей (`people-in-body.ts`) узнаёт человека по ИМЕНИ поля, а в
 * Трекере семантику поля задаёт его ТИП: пользовательское поле типа `user` с
 * произвольным именем назначает живого сотрудника, и по имени его не отличить
 * ни от какого другого. Расширять перечень имён бессмысленно — имя произвольно
 * по построению (`customFields` задачи объявлен `z.record`, `values` массовой
 * операции — `.passthrough()`).
 *
 * Поэтому пользовательские поля приведены к общему правилу рубежа: трогать можно
 * только то, что создал этот прогон. Ключ тела допускается, если он системный
 * (перечни ниже) либо адресует поле, созданное прогоном (журнал, рода
 * `globalField` и `queueLocalField`). Неизвестный ключ — отказ с его именем.
 *
 * Гейт людей по именам полей остаётся: он покрывает системные поля, которые этот
 * перечень пропускает.
 */

import type { Body, BodyViolation, ScopeContext } from './rule-matching.js';

/**
 * Системные ключи тела — по одному перечню на форму запроса, а не общим
 * объединением: `queue` законен при создании задачи и означал бы вынос задачи из
 * песочницы в `PATCH /v3/issues/{id}` и в `values` массового обновления.
 *
 * Сняты механически по DTO тел (`src/tracker_api/dto/issue/**`,
 * `src/tracker_api/dto/bulk-change/**`) и сверены с Zod-схемами инструментов
 * (`src/tools/api/issues/**`, `src/tools/api/bulk-change/**`); таблица «форма
 * запроса × ключи» — в отчёте ревью 2026-08-25. Системное поле Трекера, которого
 * наши схемы не объявляют, отклоняется осознанно: fail-closed дешевле догадки, а
 * перечень пополняется вместе со схемой, которая такое поле заводит.
 */
export const ISSUE_CREATE_KEYS = [
  'queue',
  'summary',
  'description',
  'assignee',
  'priority',
  'type',
  'unique',
] as const;

export const ISSUE_UPDATE_KEYS = [
  'summary',
  'description',
  'assignee',
  'priority',
  'type',
] as const;

/**
 * Тело `_execute` в DTO несёт только `comment`, остальное — форма перехода.
 * Перечень дополнен ключами `values` массового перехода: действие то же самое, и
 * эти ключи объявлены нашими же схемами как системные.
 */
export const TRANSITION_EXECUTE_KEYS = ['comment', 'resolution', 'assignee', 'priority'] as const;

export const BULK_UPDATE_VALUES_KEYS = [
  'summary',
  'description',
  'assignee',
  'priority',
  'type',
  'tags',
  'components',
  'versions',
  'start',
  'end',
] as const;

export const BULK_MOVE_VALUES_KEYS = ['assignee', 'priority', 'type'] as const;

export const BULK_TRANSITION_VALUES_KEYS = [
  'resolution',
  'comment',
  'assignee',
  'priority',
] as const;

/** Поле создано прогоном: глобальное поле либо локальное поле очереди. */
const createdByRun = (key: string, context: ScopeContext): boolean =>
  context.journal.has('globalField', key) || context.journal.has('queueLocalField', key);

/**
 * Первый ключ тела, который не системный и не создан этим прогоном.
 *
 * @param label — что за тело; попадает в текст отказа вместе с именем ключа.
 */
export function customFieldsViolation(label: string, systemKeys: readonly string[]): BodyViolation {
  const system = new Set(systemKeys);
  return (body: Body, context: ScopeContext): string | undefined => {
    if (body === undefined) return undefined;
    const foreign = Object.keys(body).find(
      (key) => !system.has(key) && !createdByRun(key, context)
    );
    return foreign === undefined
      ? undefined
      : `${label}: поле ${foreign} не создано этим прогоном — у пользовательского поля ` +
          'семантику задаёт тип, и поле типа user назначает живого сотрудника организации. ' +
          `Допускаются системные поля (${systemKeys.join(', ')}) и поля, созданные прогоном`;
  };
}
