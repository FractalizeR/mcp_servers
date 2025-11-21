/**
 * MCP Tool для обновления элемента чеклиста задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (update checklist item)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateChecklistItemParamsSchema } from '#tools/api/checklists/update/update-checklist-item.schema.js';

import { UPDATE_CHECKLIST_ITEM_TOOL_METADATA } from './update-checklist-item.metadata.js';

/**
 * Инструмент для обновления элемента чеклиста задачи
 *
 * Ответственность (SRP):
 * - Координация процесса обновления элемента
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class UpdateChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = UPDATE_CHECKLIST_ITEM_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateChecklistItemParamsSchema {
    return UpdateChecklistItemParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UpdateChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, issueId, checklistItemId, text, checked, assignee, deadline } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Обновление элемента чеклиста задачи', {
        issueId,
        itemId: checklistItemId,
        hasText: Boolean(text),
        hasChecked: checked !== undefined,
        hasAssignee: Boolean(assignee),
        hasDeadline: Boolean(deadline),
        fieldsCount: fields.length,
      });

      // 3. API v2: обновление элемента
      const item: ChecklistItemWithUnknownFields = await this.facade.updateChecklistItem(
        issueId,
        checklistItemId,
        {
          text,
          checked,
          assignee,
          deadline,
        }
      );

      // 4. Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<ChecklistItemWithUnknownFields>(item, fields);

      // 5. Логирование результата
      this.logger.info('Элемент чеклиста успешно обновлён', {
        issueId,
        itemId: item.id,
        checked: item.checked,
        fieldsReturned: fields.length,
      });

      return this.formatSuccess({
        itemId: item.id,
        item: filtered,
        issueId,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении элемента ${checklistItemId} чеклиста задачи ${issueId}`,
        error as Error
      );
    }
  }
}
