/**
 * Определение MCP tool для обновления задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UpdateIssueTool } from './update-issue.tool.js';

/**
 * Definition для UpdateIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class UpdateIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UpdateIssueTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          summary: this.buildSummaryParam(),
          description: this.buildDescriptionParam(),
          assignee: this.buildAssigneeParam(),
          priority: this.buildPriorityParam(),
          type: this.buildTypeParam(),
          status: this.buildStatusParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueKey'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Обновить существующую задачу. Partial update: изменяются только указанные поля. ' +
      'Параметр fields фильтрует ответ. ' +
      '\n\n' +
      'Для: изменения summary, description, assignee, priority, type, status, кастомных полей. ' +
      '\n' +
      'Не для: создания (create_issue) или workflow-переходов (execute_transition).'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ существующей задачи в формате QUEUE-123 (пример: PROJ-123, ABC-1)',
      {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }
    );
  }

  /**
   * Построить описание параметра summary
   */
  private buildSummaryParam(): Record<string, unknown> {
    return this.buildStringParam('Краткое описание задачи (заголовок). Обычно 5-10 слов.', {
      minLength: 1,
      examples: ['Исправить ошибку авторизации'],
    });
  }

  /**
   * Построить описание параметра description
   */
  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Подробное описание задачи. Поддерживает Markdown (заголовки, списки, ссылки).',
      {
        examples: ['Подробное описание с требованиями и критериями готовности'],
      }
    );
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Логин или UID пользователя. Для снятия исполнителя используй пустую строку "".',
      {
        minLength: 1,
        examples: ['user-login'],
      }
    );
  }

  /**
   * Построить описание параметра priority
   */
  private buildPriorityParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Приоритет. Типичные значения: "critical", "major", "normal", "minor", "trivial". Варьируются по очереди.',
      {
        minLength: 1,
        examples: ['normal', 'critical'],
      }
    );
  }

  /**
   * Построить описание параметра type
   */
  private buildTypeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Тип задачи. Типичные значения: "task", "bug", "epic", "story". Варьируются по очереди.',
      {
        minLength: 1,
        examples: ['task', 'bug'],
      }
    );
  }

  /**
   * Построить описание параметра status
   */
  private buildStatusParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Статус. Типичные значения: "open", "inProgress", "needInfo", "resolved", "closed". ' +
        'Варьируются по очереди. ' +
        '⚠️ Для корректной смены статуса с учетом workflow используй execute_transition.',
      {
        minLength: 1,
        examples: ['open', 'inProgress'],
      }
    );
  }

  /**
   * Построить описание параметра customFields
   */
  private buildCustomFieldsParam(): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: true,
      description:
        'Кастомные поля очереди (опционально). Объект с ключами - названиями полей. ' +
        'Значения: строка, число, булево, массив, объект. Названия полей зависят от настроек очереди.',
      examples: [
        {
          storyPoints: 5,
          environment: 'production',
        },
      ],
    };
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Основные: key, summary, description, status, assignee, priority, type, updatedAt. ' +
        'Вложенные (dot-notation): assignee.login, status.key.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary'],
      }),
      {
        minItems: 1,
        examples: [['key', 'summary', 'status', 'assignee.login']],
      }
    );
  }
}
