/**
 * Определение MCP tool для получения чеклиста задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetChecklistTool } from './get-checklist.tool.js';

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
    return GetChecklistTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
        },
        required: ['issueId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить чеклист задачи. Возвращает все элементы чеклиста с их статусом выполнения. ' +
      '\n\n' +
      'Для: получения полного списка элементов чеклиста задачи. ' +
      '\n' +
      'Не для: добавления (add_checklist_item), обновления (update_checklist_item), удаления (delete_checklist_item).'
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
}
