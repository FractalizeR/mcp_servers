/**
 * Определение MCP tool для создания очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CREATE_QUEUE_TOOL_METADATA } from './create-queue.metadata.js';

export class CreateQueueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CREATE_QUEUE_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          key: this.buildKeyParam(),
          name: this.buildNameParam(),
          lead: this.buildLeadParam(),
          defaultType: this.buildDefaultTypeParam(),
          defaultPriority: this.buildDefaultPriorityParam(),
          description: this.buildDescriptionParam(),
          issueTypes: this.buildIssueTypesParam(),
        },
        required: ['key', 'name', 'lead', 'defaultType', 'defaultPriority'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Создаёт очередь (key*, name*, lead*, defaultType*, defaultPriority*, description, issueTypes). ' +
      'Требуются права администратора. ' +
      'Для обновления: update_queue, получения: get_queue.'
    );
  }

  private buildKeyParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Уникальный ключ очереди (только заглавные буквы A-Z, 2-10 символов).',
      {
        pattern: '^[A-Z]{2,10}$',
        examples: ['TESTQ'],
      }
    );
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Название очереди.', {
      minLength: 1,
      examples: ['Test Queue'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. ID или login руководителя очереди.', {
      examples: ['john.doe'],
    });
  }

  private buildDefaultTypeParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. ID типа задачи по умолчанию (например: "1" для Task).',
      {
        examples: ['1'],
      }
    );
  }

  private buildDefaultPriorityParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. ID приоритета по умолчанию (например: "2" для Normal).',
      {
        examples: ['2'],
      }
    );
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Описание очереди (опционально).', {
      examples: ['Очередь для тестового проекта'],
    });
  }

  private buildIssueTypesParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ID доступных типов задач (опционально).',
      this.buildStringParam('ID типа задачи', {
        examples: ['1'],
      }),
      {
        examples: [['1', '2', '3']],
      }
    );
  }
}
