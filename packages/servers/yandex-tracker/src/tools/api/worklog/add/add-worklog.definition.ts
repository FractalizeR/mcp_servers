/**
 * Определение MCP tool для добавления записи времени
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { AddWorklogTool } from './add-worklog.tool.js';

/**
 * Definition для AddWorklogTool
 */
export class AddWorklogDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return AddWorklogTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          start: this.buildStartParam(),
          duration: this.buildDurationParam(),
          comment: this.buildCommentParam(),
        },
        required: ['issueId', 'start', 'duration'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Добавить запись времени (worklog) к задаче. ' +
      'Указывает время начала работы и продолжительность. ' +
      'Duration поддерживает человекочитаемый формат: "1h", "30m", "1h 30m", "2 hours 15 minutes". ' +
      '\n\n' +
      'Для: добавления учета времени, логирования затраченных часов. ' +
      '\n' +
      'Не для: получения (get_worklogs), редактирования (update_worklog), удаления (delete_worklog).'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи.', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildStartParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Дата и время начала работы (ISO 8601).', {
      examples: ['2023-01-15T10:00:00.000+0000', '2023-01-15T10:00:00Z'],
    });
  }

  private buildDurationParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Продолжительность работы. Поддерживаются форматы: "1h", "30m", "1h 30m", "2 hours", "PT1H30M".',
      {
        examples: ['1h', '30m', '1h 30m', '2 hours 15 minutes', 'PT1H30M'],
      }
    );
  }

  private buildCommentParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональный комментарий к записи времени (описание выполненной работы).',
      {
        examples: ['Работал над реализацией API', 'Тестирование и отладка'],
      }
    );
  }
}
