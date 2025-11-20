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
      'Выполняет workflow-переход (issueKey*, transitionId*, comment, customFields). ' +
      'Можно добавить комментарий и заполнить обязательные поля формы через customFields. ' +
      'Параметр fields фильтрует ответ. ' +
      '⚠️ ВАЖНО: Сначала получи доступные переходы через get_issue_transitions! ' +
      'ID перехода зависит от workflow очереди и текущего статуса. ' +
      'Для просмотра переходов: get_issue_transitions, обновления полей: update_issue.'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи (QUEUE-123)', {
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
      'Поля для возврата. Указывайте минимум для экономии токенов.',
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
