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
        },
        required: ['queueId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить детальную информацию об одной очереди по ID или ключу. ' +
      'Возвращает полные параметры очереди. ' +
      '\n\n' +
      'Для: просмотра настроек очереди, получения руководителя, типов задач. ' +
      '\n' +
      'Не для: списка очередей (get_queues), создания (create_queue).'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ очереди (например: "PROJ", "TEST").',
      {
        minLength: 1,
        examples: ['PROJ'],
      }
    );
  }

  private buildExpandParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Дополнительные поля для включения в ответ (опционально). Примеры: "projects", "components".',
      {
        examples: ['projects'],
      }
    );
  }
}
