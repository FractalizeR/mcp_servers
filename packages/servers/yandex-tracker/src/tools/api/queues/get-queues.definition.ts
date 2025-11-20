/**
 * Определение MCP tool для получения списка очередей
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_QUEUES_TOOL_METADATA } from './get-queues.metadata.js';

/**
 * Definition для GetQueuesTool
 */
export class GetQueuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_QUEUES_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          perPage: this.buildPerPageParam(),
          page: this.buildPageParam(),
          expand: this.buildExpandParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['fields', 'perPage'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает список очередей с пагинацией. ' +
      'Параметры fields* и perPage* обязательны для экономии токенов. ' +
      'Для одной очереди: get_queue, создания: create_queue.'
    );
  }

  private buildPerPageParam(): Record<string, unknown> {
    return this.buildNumberParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Количество очередей на странице. Запрашивайте минимально необходимое количество для экономии токенов (максимум 100).',
      {
        minimum: 1,
        maximum: 100,
        examples: [10, 20],
      }
    );
  }

  private buildPageParam(): Record<string, unknown> {
    return this.buildNumberParam('Номер страницы (опционально, начинается с 1).', {
      minimum: 1,
      examples: [1],
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
