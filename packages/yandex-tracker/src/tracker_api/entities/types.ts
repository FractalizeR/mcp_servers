/**
 * Утилитные типы для entities
 */

/**
 * Generic для добавления поддержки unknown полей из API.
 *
 * Используется для forward compatibility при эволюции API Яндекс.Трекера.
 * При добавлении новых полей в API они не потеряются при передаче через слои.
 *
 * @example
 * ```typescript
 * // API вернул новое поле
 * // { id: "1", key: "TEST-1", summary: "Task", newField: "value" }
 *
 * const issue: IssueWithUnknownFields = response.data;
 * // issue.newField доступно как unknown
 * // При сериализации в JSON не потеряется
 * ```
 */
export type WithUnknownFields<T> = T & {
  readonly [key: string]: unknown;
};
