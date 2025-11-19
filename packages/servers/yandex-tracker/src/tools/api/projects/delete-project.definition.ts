/**
 * Определение MCP tool для удаления проекта
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_PROJECT_TOOL_METADATA } from './delete-project.metadata.js';

export class DeleteProjectDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_PROJECT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          projectId: this.buildProjectIdParam(),
        },
        required: ['projectId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      '⚠️ ОПАСНАЯ ОПЕРАЦИЯ! Удалить проект. Требуются права администратора. ' +
      'Операция необратима! ' +
      '\n\n' +
      'Для: удаления ненужного или тестового проекта. ' +
      '\n' +
      'Не для: деактивации (используй update_project со статусом postponed).'
    );
  }

  private buildProjectIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. ID или ключ проекта для удаления.', {
      minLength: 1,
      examples: ['PROJ'],
    });
  }
}
