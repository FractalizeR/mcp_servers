/**
 * Input DTO для создания связи между задачами через API v3
 *
 * Соответствует API v3: POST /v3/issues/{issueId}/links
 *
 * Документация: https://cloud.yandex.ru/docs/tracker/concepts/issues/link-issue
 *
 * ВАЖНО: relationship определяет тип и направление связи.
 * API автоматически создаёт обратную связь для связываемой задачи.
 *
 * Примеры:
 * ```typescript
 * // Создать связь "TEST-123 имеет подзадачу TEST-456"
 * { relationship: 'has subtasks', issue: 'TEST-456' }
 *
 * // Создать связь "TEST-123 зависит от TEST-789"
 * { relationship: 'depends on', issue: 'TEST-789' }
 * ```
 */

import type { LinkRelationship } from '../../entities/link.entity.js';

/**
 * Параметры для создания связи между задачами
 */
export interface CreateLinkDto {
  /**
   * Тип и направление связи
   *
   * Поддерживаемые значения:
   * - 'relates' - связана с (двунаправленная)
   * - 'is duplicated by' - дублируется задачей
   * - 'duplicates' - дублирует задачу
   * - 'is subtask of' - является подзадачей
   * - 'has subtasks' - имеет подзадачи
   * - 'depends on' - зависит от
   * - 'is dependent by' - блокирует (от нее зависят)
   * - 'is epic of' - является epic для
   * - 'has epic' - входит в epic
   *
   * ВАЖНО: relationship определяет направление от текущей задачи.
   * Например, если для TEST-123 указать 'has subtasks' и issue 'TEST-456',
   * то TEST-123 будет родителем, а TEST-456 - подзадачей.
   */
  relationship: LinkRelationship;

  /**
   * Ключ или ID связываемой задачи
   *
   * Примеры:
   * - "TEST-456" (ключ задачи)
   * - "abc123def456" (ID задачи)
   *
   * ВАЖНО: API принимает как ключ (TEST-123), так и ID задачи
   */
  issue: string;
}
