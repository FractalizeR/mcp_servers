/**
 * Определение MCP tool для удаления элемента из чеклиста
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DeleteChecklistItemTool } from './delete-checklist-item.tool.js';

/**
 * Definition для DeleteChecklistItemTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class DeleteChecklistItemDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DeleteChecklistItemTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          checklistItemId: this.buildItemIdParam(),
        },
        required: ['issueId', 'checklistItemId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Удалить элемент из чеклиста задачи. Обязательные поля: issueId и checklistItemId. ' +
      '⚠️ ВНИМАНИЕ: Операция необратима! ' +
      '\n\n' +
      'Для: безвозвратного удаления элемента из чеклиста. ' +
      '\n' +
      'Не для: получения (get_checklist), добавления (add_checklist_item), обновления (update_checklist_item).'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи (примеры: TEST-123, PROJ-456).',
      {
        examples: ['TEST-123', 'PROJ-456'],
      }
    );
  }

  /**
   * Построить описание параметра checklistItemId
   */
  private buildItemIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор элемента чеклиста для удаления.', {
      examples: ['item123', 'cl456'],
    });
  }
}
