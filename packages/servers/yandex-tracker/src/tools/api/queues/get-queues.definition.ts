/**
 * Определение MCP tool для получения списка очередей
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetQueuesTool } from './get-queues.tool.js';

/**
 * Definition для GetQueuesTool
 */
export class GetQueuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetQueuesTool.METADATA;
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
        },
        required: [],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить список всех очередей с поддержкой пагинации. ' +
      'Возвращает массив очередей с их параметрами. ' +
      '\n\n' +
      'Для: просмотра доступных очередей, навигации по очередям. ' +
      '\n' +
      'Не для: получения одной очереди (get_queue), создания (create_queue).'
    );
  }

  private buildPerPageParam(): Record<string, unknown> {
    return this.buildNumberParam(
      'Количество очередей на странице (опционально, по умолчанию 50, максимум 100).',
      {
        minimum: 1,
        maximum: 100,
        examples: [50],
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
}
