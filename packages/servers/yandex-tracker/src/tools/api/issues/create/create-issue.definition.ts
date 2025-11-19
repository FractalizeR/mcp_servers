/**
 * Определение MCP tool для создания задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CREATE_ISSUE_TOOL_METADATA } from './create-issue.metadata.js';

/**
 * Definition для CreateIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class CreateIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CREATE_ISSUE_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          queue: this.buildQueueParam(),
          summary: this.buildSummaryParam(),
          description: this.buildDescriptionParam(),
          assignee: this.buildAssigneeParam(),
          priority: this.buildPriorityParam(),
          type: this.buildTypeParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['queue', 'summary'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Создать новую задачу. Обязательные поля: queue и summary. ' +
      'Параметр fields фильтрует ответ. ' +
      '\n\n' +
      'Для: создания задачи с полями summary, description, assignee, priority, type, customFields. ' +
      '\n' +
      'Не для: обновления (update_issue).'
    );
  }

  /**
   * Построить описание параметра queue
   */
  private buildQueueParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ очереди в формате 1-10 заглавных букв/цифр, начинается с буквы (примеры: PROJ, TEST, DEV2024).',
      {
        pattern: '^[A-Z][A-Z0-9]{0,9}$',
        examples: ['PROJ'],
      }
    );
  }

  /**
   * Построить описание параметра summary
   */
  private buildSummaryParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Краткое описание задачи (название). Обычно 5-10 слов.',
      {
        minLength: 1,
        examples: ['Исправить баг с авторизацией'],
      }
    );
  }

  /**
   * Построить описание параметра description
   */
  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Подробное описание задачи (опционально). Поддерживает Markdown.',
      {
        examples: ['При попытке войти с неверным паролем не отображается сообщение об ошибке'],
      }
    );
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam('Исполнитель (опционально). Логин или UID пользователя.', {
      examples: ['ivanov'],
    });
  }

  /**
   * Построить описание параметра priority
   */
  private buildPriorityParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Приоритет (опционально). Типичные значения: "blocker", "critical", "major", "normal", "minor", "trivial". Варьируются по очереди.',
      {
        examples: ['normal'],
      }
    );
  }

  /**
   * Построить описание параметра type
   */
  private buildTypeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Тип задачи (опционально). Типичные значения: "task", "bug", "epic", "story". Варьируются по очереди.',
      {
        examples: ['task'],
      }
    );
  }

  /**
   * Построить описание параметра customFields
   */
  private buildCustomFieldsParam(): Record<string, unknown> {
    return {
      type: 'object',
      description:
        'Кастомные поля очереди (опционально). Объект с ключами - названиями полей. ' +
        'Значения: строка, число, булево, массив, объект. Названия полей зависят от настроек очереди.',
      additionalProperties: true,
      examples: [{ estimatedHours: 8 }],
    };
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Основные: key, summary, description, status, assignee, createdAt.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key'],
      }),
      {
        minItems: 1,
        examples: [['key', 'summary', 'status']],
      }
    );
  }
}
