/**
 * Определение MCP tool для получения списка компонентов очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetComponentsTool } from './get-components.tool.js';

/**
 * Definition для GetComponentsTool
 */
export class GetComponentsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetComponentsTool.METADATA;
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
      'Получить список компонентов очереди. ' +
      'Возвращает все компоненты с их параметрами. ' +
      '\n\n' +
      'Для: просмотра компонентов очереди, управления компонентами. ' +
      '\n' +
      'Не для: создания компонентов (create_component), изменения (update_component).'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID или ключ очереди (обязательно).', {
      examples: ['QUEUE', '1'],
    });
  }
}
