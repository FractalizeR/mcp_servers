/**
 * Стандартные наборы полей для unit тестов
 * Обеспечивают консистентность и переиспользование в тестах
 */

export const STANDARD_ISSUE_FIELDS = [
  'id',
  'key',
  'summary',
  'description',
  'status',
  'queue',
  'createdAt',
  'updatedAt',
  'createdBy',
  'assignee',
  'priority',
] as const;

export const MINIMAL_ISSUE_FIELDS = ['id', 'key', 'summary'] as const;

export const STANDARD_QUEUE_FIELDS = ['id', 'key', 'name', 'description', 'lead'] as const;

export const MINIMAL_QUEUE_FIELDS = ['id', 'key', 'name'] as const;

export const STANDARD_COMMENT_FIELDS = ['id', 'text', 'createdAt', 'createdBy'] as const;

export const STANDARD_CHECKLIST_FIELDS = ['id', 'text', 'checked', 'assignee'] as const;

export const STANDARD_ATTACHMENT_FIELDS = ['id', 'name', 'size', 'createdAt', 'createdBy'] as const;

export const STANDARD_LINK_FIELDS = ['id', 'type', 'direction', 'object'] as const;

export const STANDARD_PROJECT_FIELDS = ['id', 'key', 'name', 'description', 'lead'] as const;

export const STANDARD_WORKLOG_FIELDS = ['id', 'duration', 'createdAt', 'createdBy'] as const;

export const STANDARD_TRANSITION_FIELDS = ['id', 'to', 'display'] as const;

export const STANDARD_CHANGELOG_FIELDS = ['updatedAt', 'updatedBy', 'fields'] as const;

export const STANDARD_COMPONENT_FIELDS = ['id', 'name', 'description', 'lead'] as const;

/**
 * Хелпер для создания кастомного набора полей
 */
export function createFieldsSet(...fields: string[]): string[] {
  return fields;
}
