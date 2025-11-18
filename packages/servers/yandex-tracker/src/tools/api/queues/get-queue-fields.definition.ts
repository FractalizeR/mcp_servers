/**
 * Определение MCP tool для получения полей очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetQueueFieldsTool } from './get-queue-fields.tool.js';

export class GetQueueFieldsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetQueueFieldsTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
        },
        required: ['queueId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить список обязательных полей очереди. ' +
      'Возвращает поля, которые должны быть заполнены при создании задачи в этой очереди. ' +
      '\n\n' +
      'Для: проверки требований к полям перед созданием задачи. ' +
      '\n' +
      'Не для: получения параметров очереди (get_queue).'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ очереди.', {
      examples: ['PROJ'],
    });
  }
}
