/**
 * MCP Tool для удаления элемента из чеклиста задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete checklist item)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteChecklistItemDefinition } from '@tools/api/checklists/delete/delete-checklist-item.definition.js';
import { DeleteChecklistItemParamsSchema } from '@tools/api/checklists/delete/delete-checklist-item.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

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
  static override readonly METADATA = {
    name: buildToolName('delete_checklist_item', MCP_TOOL_PREFIX),
    description: '[Checklist/Write] Удалить элемент из чеклиста',
    category: ToolCategory.CHECKLISTS,
    subcategory: 'write',
    priority: ToolPriority.HIGH,
    tags: ['checklist', 'delete', 'remove', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new DeleteChecklistItemDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
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
