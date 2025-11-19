/**
 * Определение MCP tool для массового перемещения задач между очередями
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { BULK_MOVE_ISSUES_TOOL_METADATA } from './bulk-move-issues.metadata.js';

/**
 * Definition для BulkMoveIssuesTool
 */
export class BulkMoveIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return BULK_MOVE_ISSUES_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issues: this.buildIssuesParam(),
          queue: this.buildQueueParam(),
          moveAllFields: this.buildMoveAllFieldsParam(),
          values: this.buildValuesParam(),
        },
        required: ['issues', 'queue'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Массовое перемещение задач из одной очереди в другую. ' +
      'Операция выполняется асинхронно на сервере и возвращает operationId для проверки статуса. ' +
      'Используй get_bulk_change_status для мониторинга прогресса. ' +
      '\n\n' +
      'Для: перемещения множества задач между очередями с сохранением или обновлением полей. ' +
      '\n' +
      'Не для: перемещения одной задачи (используй update_issue с полем queue) или изменения других полей (используй bulk_update_issues).'
    );
  }

  /**
   * Построить описание параметра issues
   */
  private buildIssuesParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ключей задач для перемещения. Формат: QUEUE-123. ' +
        'Задачи могут быть из разных очередей, но все будут перемещены в одну целевую очередь.',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }),
      {
        minItems: 1,
        examples: [['OLDQUEUE-123', 'OLDQUEUE-456', 'ANOTHER-789']],
      }
    );
  }

  /**
   * Построить описание параметра queue
   */
  private buildQueueParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ целевой очереди. Формат: QUEUEKEY (только заглавные буквы и цифры). ' +
        'Примеры: "SUPPORT", "DEVELOPMENT", "TESTING", "BACKLOG".',
      {
        pattern: '^[A-Z][A-Z0-9]+$',
        examples: ['SUPPORT', 'DEVELOPMENT', 'TESTING'],
      }
    );
  }

  /**
   * Построить описание параметра moveAllFields
   */
  private buildMoveAllFieldsParam(): Record<string, unknown> {
    return {
      type: 'boolean',
      description:
        'Переместить все поля включая кастомные (true) или только стандартные (false, по умолчанию). ' +
        'Если true, кастомные поля будут перенесены только если они существуют в целевой очереди.',
      examples: [true, false],
    };
  }

  /**
   * Построить описание параметра values
   */
  private buildValuesParam(): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: true,
      description:
        'Опциональные поля для обновления при перемещении. ' +
        'Позволяет изменить поля задач в процессе перемещения в новую очередь. ' +
        'Например, можно установить нового исполнителя или приоритет.',
      properties: {
        assignee: {
          type: 'string',
          description: 'Исполнитель в новой очереди (логин пользователя)',
          examples: ['new-assignee'],
        },
        priority: {
          type: 'string',
          description: 'Приоритет в новой очереди',
          examples: ['normal', 'critical'],
        },
        type: {
          type: 'string',
          description: 'Тип задачи в новой очереди',
          examples: ['task', 'bug'],
        },
      },
      examples: [
        {
          assignee: 'support-team',
          priority: 'normal',
        },
      ],
    };
  }
}
