/**
 * Определение MCP tool для получения списка проектов
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetProjectsTool } from './get-projects.tool.js';

export class GetProjectsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetProjectsTool.METADATA;
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
          queueId: this.buildQueueIdParam(),
        },
        required: [],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить список всех проектов с поддержкой пагинации и фильтрации. ' +
      'Возвращает массив проектов. ' +
      '\n\n' +
      'Для: просмотра списка проектов, фильтрации по очереди. ' +
      '\n' +
      'Не для: получения одного проекта (get_project), создания (create_project).'
    );
  }

  private buildPerPageParam(): Record<string, unknown> {
    return this.buildNumberParam('Количество записей на странице (1-100, по умолчанию 50).', {
      minimum: 1,
      maximum: 100,
      examples: [50],
    });
  }

  private buildPageParam(): Record<string, unknown> {
    return this.buildNumberParam('Номер страницы (начинается с 1, по умолчанию 1).', {
      minimum: 1,
      examples: [1],
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

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Фильтр по ID или ключу очереди - вернет только проекты, связанные с этой очередью (опционально).',
      {
        examples: ['QUEUE'],
      }
    );
  }
}
