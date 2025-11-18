/**
 * Определение MCP tool для получения одного проекта
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetProjectTool } from './get-project.tool.js';

export class GetProjectDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetProjectTool.METADATA;
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
        },
        required: ['projectId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить детальную информацию об одном проекте по ID или ключу. ' +
      'Возвращает полные параметры проекта. ' +
      '\n\n' +
      'Для: просмотра настроек проекта, получения руководителя, связанных очередей. ' +
      '\n' +
      'Не для: списка проектов (get_projects), создания (create_project).'
    );
  }

  private buildProjectIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ проекта (например: "PROJ", "project123").',
      {
        minLength: 1,
        examples: ['PROJ'],
      }
    );
  }

  private buildExpandParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Дополнительные поля для включения в ответ (опционально). Примеры: "queues", "team".',
      {
        examples: ['queues'],
      }
    );
  }
}
