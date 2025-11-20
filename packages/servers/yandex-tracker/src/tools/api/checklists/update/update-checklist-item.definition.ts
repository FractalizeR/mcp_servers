/**
 * Определение MCP tool для обновления элемента чеклиста
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UPDATE_CHECKLIST_ITEM_TOOL_METADATA } from './update-checklist-item.metadata.js';

/**
 * Definition для UpdateChecklistItemTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class UpdateChecklistItemDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UPDATE_CHECKLIST_ITEM_TOOL_METADATA;
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
          text: this.buildTextParam(),
          checked: this.buildCheckedParam(),
          assignee: this.buildAssigneeParam(),
          deadline: this.buildDeadlineParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'checklistItemId', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Обновляет элемент чеклиста (issueId*, checklistItemId*, fields*, text, checked, assignee, deadline). ' +
      'Поддерживает partial update - можно обновить только нужные поля. ' +
      'Для получения: get_checklist, добавления: add_checklist_item, удаления: delete_checklist_item.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  /**
   * Построить описание параметра checklistItemId
   */
  private buildItemIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор элемента чеклиста.', {
      examples: ['item123', 'cl456'],
    });
  }

  /**
   * Построить описание параметра text
   */
  private buildTextParam(): Record<string, unknown> {
    return this.buildStringParam('Опциональный. Новый текст элемента чеклиста.', {
      examples: ['Обновленный текст задачи', 'Проверено и готово к релизу'],
    });
  }

  /**
   * Построить описание параметра checked
   */
  private buildCheckedParam(): Record<string, unknown> {
    return {
      type: 'boolean',
      description: 'Опциональный. Новый статус выполнения элемента.',
    };
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональный. Новый ID пользователя, назначенного на выполнение элемента.',
      {
        examples: ['user123', 'jane.smith'],
      }
    );
  }

  /**
   * Построить описание параметра deadline
   */
  private buildDeadlineParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональный. Новый дедлайн выполнения элемента в формате ISO 8601.',
      {
        examples: ['2025-12-31T23:59:59.000Z', '2026-01-15T12:00:00.000Z'],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата в результате. Используйте только необходимые поля для экономии контекста.',
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
