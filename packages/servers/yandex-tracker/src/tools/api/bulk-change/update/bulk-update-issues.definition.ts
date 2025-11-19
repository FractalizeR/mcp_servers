/**
 * Определение MCP tool для массового обновления задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { BULK_UPDATE_ISSUES_TOOL_METADATA } from './bulk-update-issues.metadata.js';

/**
 * Definition для BulkUpdateIssuesTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class BulkUpdateIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return BULK_UPDATE_ISSUES_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issues: this.buildIssuesParam(),
          values: this.buildValuesParam(),
        },
        required: ['issues', 'values'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Массовое обновление полей нескольких задач одновременно. ' +
      'Операция выполняется асинхронно на сервере и возвращает operationId для проверки статуса. ' +
      'Используй get_bulk_change_status для мониторинга прогресса. ' +
      '\n\n' +
      'Для: обновления одинаковых полей у множества задач (priority, assignee, tags, etc.). ' +
      '\n' +
      'Не для: обновления одной задачи (используй update_issue) или смены статусов (используй bulk_transition_issues).'
    );
  }

  /**
   * Построить описание параметра issues
   */
  private buildIssuesParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ключей задач для обновления. Формат: QUEUE-123. ' +
        'Можно обновлять задачи из разных очередей одновременно.',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }),
      {
        minItems: 1,
        examples: [['PROJ-123', 'PROJ-456', 'OTHER-789']],
      }
    );
  }

  /**
   * Построить описание параметра values
   */
  private buildValuesParam(): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: true,
      description:
        'Объект с обновляемыми полями. Все поля опциональны (partial update). ' +
        'Стандартные поля: summary, description, assignee, priority, type, tags, components, versions, start, end. ' +
        'Также поддерживаются кастомные поля.',
      properties: {
        summary: {
          type: 'string',
          description: 'Краткое описание задачи (заголовок)',
          examples: ['Исправить ошибку авторизации'],
        },
        description: {
          type: 'string',
          description: 'Подробное описание задачи. Поддерживает Markdown.',
          examples: ['Подробное описание с требованиями'],
        },
        assignee: {
          type: 'string',
          description:
            'Исполнитель (логин пользователя). Для снятия исполнителя используй пустую строку "".',
          examples: ['user-login'],
        },
        priority: {
          type: 'string',
          description:
            'Приоритет. Типичные значения: "critical", "major", "normal", "minor", "trivial".',
          examples: ['normal', 'critical'],
        },
        type: {
          type: 'string',
          description: 'Тип задачи. Типичные значения: "task", "bug", "epic", "story".',
          examples: ['task', 'bug'],
        },
        tags: {
          type: 'object',
          description: 'Теги задачи. Можно добавлять (add) и удалять (remove).',
          properties: {
            add: {
              type: 'array',
              items: { type: 'string' },
              description: 'Теги для добавления',
              examples: [['bug', 'critical']],
            },
            remove: {
              type: 'array',
              items: { type: 'string' },
              description: 'Теги для удаления',
              examples: [['feature']],
            },
          },
        },
        components: {
          type: 'array',
          items: { type: 'number' },
          description: 'Массив ID компонентов',
          examples: [[1, 2, 3]],
        },
        versions: {
          type: 'array',
          items: { type: 'number' },
          description: 'Массив ID версий',
          examples: [[1, 2]],
        },
        start: {
          type: 'string',
          description: 'Дата начала в формате ISO 8601',
          examples: ['2024-01-01T00:00:00.000Z'],
        },
        end: {
          type: 'string',
          description: 'Дедлайн в формате ISO 8601',
          examples: ['2024-12-31T23:59:59.999Z'],
        },
      },
      examples: [
        {
          priority: 'minor',
          tags: { add: ['bug'], remove: ['feature'] },
          assignee: 'john-doe',
        },
      ],
    };
  }
}
