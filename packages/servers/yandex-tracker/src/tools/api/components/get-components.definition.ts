/**
 * Определение MCP tool для получения списка компонентов очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_COMPONENTS_TOOL_METADATA } from './get-components.metadata.js';

/**
 * Definition для GetComponentsTool
 */
export class GetComponentsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_COMPONENTS_TOOL_METADATA;
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
      'Получает компоненты очереди (queueId*, fields*). ' +
      'Параметр fields определяет, какие поля компонентов вернуть в ответе (например: ["id", "name"]). ' +
      'Для создания: create_component, изменения: update_component.'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ очереди (PROJ)', {
      examples: ['QUEUE', '1'],
    });
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'name', 'description', 'lead'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'name'],
          ['id', 'name', 'description', 'lead'],
        ],
      }
    );
  }
}
