/**
 * Определение MCP tool для добавления элемента в чеклист
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { AddChecklistItemTool } from './add-checklist-item.tool.js';

/**
 * Definition для AddChecklistItemTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class AddChecklistItemDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return AddChecklistItemTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          text: this.buildTextParam(),
          checked: this.buildCheckedParam(),
          assignee: this.buildAssigneeParam(),
          deadline: this.buildDeadlineParam(),
        },
        required: ['issueId', 'text'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Добавить элемент в чеклист задачи. Обязательные поля: issueId и text. ' +
      'Можно указать статус, исполнителя и дедлайн. ' +
      '\n\n' +
      'Для: добавления нового элемента в чеклист. ' +
      '\n' +
      'Не для: получения (get_checklist), обновления (update_checklist_item), удаления (delete_checklist_item).'
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
   * Построить описание параметра text
   */
  private buildTextParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Текст элемента чеклиста.', {
      examples: ['Проверить код-ревью', 'Написать тесты', 'Обновить документацию'],
    });
  }

  /**
   * Построить описание параметра checked
   */
  private buildCheckedParam(): Record<string, unknown> {
    return {
      type: 'boolean',
      description: 'Опциональный. Статус выполнения элемента (по умолчанию false).',
      default: false,
    };
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональный. ID пользователя, назначенного на выполнение элемента.',
      {
        examples: ['user123', 'john.doe'],
      }
    );
  }

  /**
   * Построить описание параметра deadline
   */
  private buildDeadlineParam(): Record<string, unknown> {
    return this.buildStringParam('Опциональный. Дедлайн выполнения элемента в формате ISO 8601.', {
      examples: ['2025-12-31T23:59:59.000Z', '2026-01-15T12:00:00.000Z'],
    });
  }
}
