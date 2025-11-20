/**
 * Определение MCP tool для обновления компонента
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UPDATE_COMPONENT_TOOL_METADATA } from './update-component.metadata.js';

/**
 * Definition для UpdateComponentTool
 */
export class UpdateComponentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UPDATE_COMPONENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          componentId: this.buildComponentIdParam(),
          name: this.buildNameParam(),
          description: this.buildDescriptionParam(),
          lead: this.buildLeadParam(),
          assignAuto: this.buildAssignAutoParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['componentId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Обновляет компонент (componentId*, fields*, name, description, lead, assignAuto). ' +
      'Параметр fields определяет, какие поля компонента вернуть в ответе (например: ["id", "name"]). ' +
      'Для создания: create_component, удаления: delete_component.'
    );
  }

  private buildComponentIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID компонента для обновления (обязательно).', {
      examples: ['12345', '67890'],
    });
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('Новое название компонента (опционально).', {
      examples: ['Backend API', 'Frontend UI'],
    });
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Новое описание компонента (опционально).', {
      examples: ['Обновленное описание компонента'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('Новый руководитель компонента (опционально).', {
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
