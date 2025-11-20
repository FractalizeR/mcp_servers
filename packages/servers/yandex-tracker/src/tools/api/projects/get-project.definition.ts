/**
 * Определение MCP tool для получения одного проекта
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_PROJECT_TOOL_METADATA } from './get-project.metadata.js';

export class GetProjectDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_PROJECT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          projectId: this.buildProjectIdParam(),
          expand: this.buildExpandParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['projectId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает детали проекта (projectId*, fields*, expand). ' +
      'Возвращает полные параметры проекта. ' +
      'Для списка: get_projects, создания: create_project.'
    );
  }

  private buildProjectIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. ID проекта (PROJ)', {
      minLength: 1,
      examples: ['PROJ'],
    });
  }

  private buildExpandParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Дополнительные поля для включения в ответ (опционально). Примеры: "queues", "team".',
      {
        examples: ['queues'],
      }
    );
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'key', 'name'],
          ['id', 'key', 'name', 'lead', 'status'],
        ],
      }
    );
  }
}
