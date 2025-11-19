/**
 * Определение MCP tool для выполнения перехода задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { TRANSITION_ISSUE_TOOL_METADATA } from './transition-issue.metadata.js';

/**
 * Definition для TransitionIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class TransitionIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return TRANSITION_ISSUE_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          transitionId: this.buildTransitionIdParam(),
          comment: this.buildCommentParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueKey', 'transitionId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Выполнить workflow-переход задачи (изменить статус). ' +
      'Можно добавить комментарий и заполнить обязательные поля формы через customFields. ' +
      'Параметр fields фильтрует ответ. ' +
      '\n\n' +
      '⚠️ ВАЖНО: Сначала получи доступные переходы через get_issue_transitions! ' +
      'ID перехода зависит от workflow очереди и текущего статуса. ' +
      '\n\n' +
      'Для: изменения статуса с учетом workflow, добавления комментария при переходе, заполнения обязательных полей (resolution). ' +
      '\n' +
      'Не для: просмотра переходов (get_issue_transitions), обновления других полей (update_issue).'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи в формате QUEUE-123 (пример: PROJ-123, ABC-1)', {
      pattern: '^[A-Z][A-Z0-9]+-\\d+$',
      examples: ['PROJ-123'],
    });
  }

  /**
   * Построить описание параметра transitionId
   */
  private buildTransitionIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'ID перехода из get_issue_transitions. ' +
        'Типичные значения: "start", "resolve", "close", "reopen", "need_info". ' +
        'ID зависят от workflow очереди и текущего статуса.',
      {
        minLength: 1,
        examples: ['start', 'resolve', 'close', 'reopen'],
      }
    );
  }

  /**
   * Построить описание параметра comment
   */
  private buildCommentParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Комментарий при переходе (опционально). Используй для объяснения причины перехода или заметок команде.',
      {
        examples: ['Задача выполнена', 'Требуется дополнительная информация'],
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
        'Поля формы перехода (опционально). ' +
        'Типичные поля: "resolution" (fixed, duplicate, wontFix, cancelled), "assignee". ' +
        'Проверь требования формы в get_issue_transitions - некоторые переходы требуют обязательных полей.',
      additionalProperties: true,
      examples: [{ resolution: 'fixed' }, { resolution: 'duplicate', assignee: 'username' }],
    };
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов (без фильтрации: ~2000-5000 токенов, с фильтрацией: ~200-500). ' +
        '\n\n' +
        'Поля: key, summary, description, status, priority, type, assignee, author, queue, project, sprint, epic, tags, ' +
        'resolution, createdAt, updatedAt, statusStartTime, start, end, followers, commentWithoutExternalMessageCount, votes. ' +
        'Вложенные (dot-notation): assignee.login, status.key, queue.key, priority.key, type.key.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'status.key'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'status.key', 'resolution', 'updatedAt'],
        ],
      }
    );
  }
}
