/**
 * Определение MCP tool для создания компонента
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CREATE_COMPONENT_TOOL_METADATA } from './create-component.metadata.js';

/**
 * Definition для CreateComponentTool
 */
export class CreateComponentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CREATE_COMPONENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
          name: this.buildNameParam(),
          description: this.buildDescriptionParam(),
          lead: this.buildLeadParam(),
          assignAuto: this.buildAssignAutoParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['queueId', 'name', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Создать новый компонент в очереди. ' +
      'Требует указания очереди, названия компонента и fields. ' +
      'Параметр fields определяет, какие поля компонента вернуть в ответе (например: ["id", "name"]). ' +
      '\n\n' +
      'Для: создания нового компонента для группировки задач. ' +
      '\n' +
      'Не для: получения компонентов (get_components), изменения (update_component).'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID или ключ очереди (обязательно).', {
      examples: ['QUEUE', '1'],
    });
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('Название компонента (обязательно).', {
      examples: ['Backend', 'Frontend', 'API'],
    });
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Описание компонента (опционально).', {
      examples: ['Серверная часть приложения'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('ID или login руководителя компонента (опционально).', {
      examples: ['user-login', '1234567890'],
    });
  }

  private buildAssignAutoParam(): Record<string, unknown> {
    return this.buildBooleanParam(
      'Автоматически назначать задачи руководителю компонента (опционально).'
    );
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Фильтр полей ответа. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, name, description, lead, queue, assignAuto.',
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
