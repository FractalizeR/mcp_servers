/**
 * Определение MCP tool для удаления компонента
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_COMPONENT_TOOL_METADATA } from './delete-component.metadata.js';

/**
 * Definition для DeleteComponentTool
 */
export class DeleteComponentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_COMPONENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          componentId: this.buildComponentIdParam(),
        },
        required: ['componentId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Удаляет компонент (componentId*). ' +
      'Операция необратима, компонент будет удален безвозвратно. ' +
      'Для изменения: update_component, создания: create_component.'
    );
  }

  private buildComponentIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID компонента для удаления (обязательно).', {
      examples: ['12345', '67890'],
    });
  }
}
