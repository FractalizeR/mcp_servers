/**
 * Определение MCP tool для получения полей очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_QUEUE_FIELDS_TOOL_METADATA } from './get-queue-fields.metadata.js';

export class GetQueueFieldsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_QUEUE_FIELDS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['queueId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает обязательные поля очереди. ' +
      'Возвращает поля, которые должны быть заполнены при создании задачи в этой очереди. ' +
      'Для параметров очереди: get_queue.'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ очереди (PROJ)', {
      examples: ['PROJ'],
    });
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'key', 'name', 'type', 'required'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'key', 'name'],
          ['id', 'key', 'name', 'type', 'required'],
        ],
      }
    );
  }
}
