/**
 * Определение MCP tool для получения списка проектов
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_PROJECTS_TOOL_METADATA } from './get-projects.metadata.js';

export class GetProjectsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_PROJECTS_TOOL_METADATA;
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
          fields: this.buildFieldsParam(),
        },
        required: ['fields', 'perPage'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает список проектов (fields*, perPage*, page, expand, queueId). ' +
      'Возвращает массив проектов. Поддержка пагинации и фильтрации. ' +
      'Для одного проекта: get_project, создания: create_project.'
    );
  }

  private buildPerPageParam(): Record<string, unknown> {
    return this.buildNumberParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Количество проектов на странице. Запрашивайте минимально необходимое количество для экономии токенов (максимум 100).',
      {
        minimum: 1,
        maximum: 100,
        examples: [10, 20],
      }
    );
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
    return this.buildStringParam('Ключ очереди (PROJ)', {
      examples: ['QUEUE'],
    });
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
