/**
 * Определение MCP tool для получения одной очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_QUEUE_TOOL_METADATA } from './get-queue.metadata.js';

export class GetQueueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_QUEUE_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
          expand: this.buildExpandParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['queueId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает детали очереди по ID или ключу. ' +
      'Параметр fields обязателен для экономии токенов. ' +
      'Для списка: get_queues, создания: create_queue.'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ очереди (PROJ)', {
      minLength: 1,
      examples: ['PROJ'],
    });
  }

  private buildExpandParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Дополнительные поля для включения в ответ (опционально). Примеры: "projects", "components".',
      {
        examples: ['projects'],
      }
    );
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'name', 'lead.login'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'name', 'lead'],
          ['key', 'name', 'lead.login', 'defaultType.key'],
        ],
      }
    );
  }
}
