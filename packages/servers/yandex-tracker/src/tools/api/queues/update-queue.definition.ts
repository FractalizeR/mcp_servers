/**
 * Определение MCP tool для обновления очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UPDATE_QUEUE_TOOL_METADATA } from './update-queue.metadata.js';

export class UpdateQueueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UPDATE_QUEUE_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
          name: this.buildNameParam(),
          lead: this.buildLeadParam(),
          defaultType: this.buildDefaultTypeParam(),
          defaultPriority: this.buildDefaultPriorityParam(),
          description: this.buildDescriptionParam(),
          issueTypes: this.buildIssueTypesParam(),
        },
        required: ['queueId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Обновляет параметры очереди (name, lead, defaultType, defaultPriority, description, issueTypes). ' +
      'Требуются права администратора. Все поля опциональны кроме queueId. ' +
      'Для создания: create_queue, получения: get_queue.'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ очереди (PROJ)', {
      examples: ['PROJ'],
    });
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('Новое название очереди (опционально).', {
      examples: ['Updated Queue Name'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('Новый руководитель очереди (опционально).', {
      examples: ['john.doe'],
    });
  }

  private buildDefaultTypeParam(): Record<string, unknown> {
    return this.buildStringParam('Новый тип задачи по умолчанию (опционально).', {
      examples: ['1'],
    });
  }

  private buildDefaultPriorityParam(): Record<string, unknown> {
    return this.buildStringParam('Новый приоритет по умолчанию (опционально).', {
      examples: ['2'],
    });
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Новое описание очереди (опционально).', {
      examples: ['Updated description'],
    });
  }

  private buildIssueTypesParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Новый массив ID доступных типов задач (опционально).',
      this.buildStringParam('ID типа задачи', {
        examples: ['1'],
      }),
      {
        examples: [['1', '2', '3']],
      }
    );
  }
}
