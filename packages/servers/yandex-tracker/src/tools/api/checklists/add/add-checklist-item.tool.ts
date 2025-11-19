/**
 * MCP Tool для добавления элемента в чеклист задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (add checklist item)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';
import { AddChecklistItemDefinition } from '@tools/api/checklists/add/add-checklist-item.definition.js';
import { AddChecklistItemParamsSchema } from '@tools/api/checklists/add/add-checklist-item.schema.js';

import { ADD_CHECKLIST_ITEM_TOOL_METADATA } from './add-checklist-item.metadata.js';

/**
 * Инструмент для добавления элемента в чеклист задачи
 *
 * Ответственность (SRP):
 * - Координация процесса добавления элемента
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class AddChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ADD_CHECKLIST_ITEM_TOOL_METADATA;

  private readonly definition = new AddChecklistItemDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, text, checked, assignee, deadline } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Добавление элемента в чеклист задачи', {
        issueId,
        textLength: text.length,
        hasAssignee: Boolean(assignee),
        hasDeadline: Boolean(deadline),
      });

      // 3. API v2: добавление элемента
      const item: ChecklistItemWithUnknownFields = await this.facade.addChecklistItem(issueId, {
        text,
        checked,
        assignee,
        deadline,
      });

      // 4. Логирование результата
      this.logger.info('Элемент успешно добавлен в чеклист', {
        issueId,
        itemId: item.id,
        checked: item.checked,
      });

      return this.formatSuccess({
        itemId: item.id,
        item,
        issueId,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении элемента в чеклист задачи ${issueId}`,
        error as Error
      );
    }
  }
}
