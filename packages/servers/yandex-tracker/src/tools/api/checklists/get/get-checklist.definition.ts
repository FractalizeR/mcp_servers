/**
 * Определение MCP tool для получения чеклиста задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_CHECKLIST_TOOL_METADATA } from './get-checklist.metadata.js';

/**
 * Definition для GetChecklistTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetChecklistDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_CHECKLIST_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получает чеклист (issueId*, fields*). ' +
      'Возвращает все элементы чеклиста с их статусом выполнения. ' +
      'Для добавления: add_checklist_item, обновления: update_checklist_item, удаления: delete_checklist_item.'
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
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата для каждого элемента чеклиста. Используйте только необходимые поля для экономии контекста.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'text', 'checked'],
          ['id', 'text', 'assignee.login', 'deadline'],
        ],
      }
    );
  }
}
