/**
 * Определение MCP tool для обновления компонента
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UpdateComponentTool } from './update-component.tool.js';

/**
 * Definition для UpdateComponentTool
 */
export class UpdateComponentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UpdateComponentTool.METADATA;
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
        },
        required: ['componentId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Обновить параметры компонента. ' +
      'Можно изменить название, описание, руководителя или настройку автоназначения. ' +
      '\n\n' +
      'Для: изменения существующего компонента. ' +
      '\n' +
      'Не для: создания компонента (create_component), удаления (delete_component).'
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
}
