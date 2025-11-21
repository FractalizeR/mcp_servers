/**
 * MCP Tool для удаления элемента из чеклиста задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete checklist item)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteChecklistItemParamsSchema } from '#tools/api/checklists/delete/delete-checklist-item.schema.js';

import { DELETE_CHECKLIST_ITEM_TOOL_METADATA } from './delete-checklist-item.metadata.js';

/**
 * Инструмент для удаления элемента из чеклиста задачи
 *
 * Ответственность (SRP):
 * - Координация процесса удаления элемента
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class DeleteChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_CHECKLIST_ITEM_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteChecklistItemParamsSchema {
    return DeleteChecklistItemParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, checklistItemId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Удаление элемента из чеклиста задачи', {
        issueId,
        itemId: checklistItemId,
      });

      // 3. API v2: удаление элемента
      await this.facade.deleteChecklistItem(issueId, checklistItemId);

      // 4. Логирование результата
      this.logger.info('Элемент успешно удалён из чеклиста', {
        issueId,
        itemId: checklistItemId,
      });

      return this.formatSuccess({
        message: `Элемент ${checklistItemId} успешно удалён из чеклиста задачи ${issueId}`,
        itemId: checklistItemId,
        issueId,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении элемента ${checklistItemId} из чеклиста задачи ${issueId}`,
        error as Error
      );
    }
  }
}
