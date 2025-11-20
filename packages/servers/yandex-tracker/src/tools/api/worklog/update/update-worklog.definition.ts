/**
 * Определение MCP tool для обновления записи времени
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UPDATE_WORKLOG_TOOL_METADATA } from './update-worklog.metadata.js';

/**
 * Definition для UpdateWorklogTool
 */
export class UpdateWorklogDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UPDATE_WORKLOG_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          worklogId: this.buildWorklogIdParam(),
          start: this.buildStartParam(),
          duration: this.buildDurationParam(),
          comment: this.buildCommentParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'worklogId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Обновляет запись времени (start, duration, comment). ' +
      'Duration поддерживает человекочитаемый формат: "1h", "30m", "1h 30m". ' +
      'Для получения: get_worklogs, добавления: add_worklog, удаления: delete_worklog.'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildWorklogIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор записи времени.', {
      examples: ['123', '456'],
    });
  }

  private buildStartParam(): Record<string, unknown> {
    return this.buildStringParam('Опциональное новое время начала работы (ISO 8601).', {
      examples: ['2023-01-15T10:00:00.000+0000', '2023-01-15T10:00:00Z'],
    });
  }

  private buildDurationParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональная новая продолжительность работы. Поддерживаются форматы: "1h", "30m", "1h 30m", "PT1H30M".',
      {
        examples: ['1h', '30m', '1h 30m', '2 hours', 'PT2H'],
      }
    );
  }

  private buildCommentParam(): Record<string, unknown> {
    return this.buildStringParam('Опциональный новый комментарий к записи времени.', {
      examples: ['Обновленный комментарий', 'Исправлено описание работы'],
    });
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'duration', 'comment'],
          ['id', 'start', 'createdBy'],
        ],
      }
    );
  }
}
