/**
 * Определение MCP tool для получения статуса bulk операции
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_BULK_CHANGE_STATUS_TOOL_METADATA } from './get-bulk-change-status.metadata.js';

/**
 * Definition для GetBulkChangeStatusTool
 */
export class GetBulkChangeStatusDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_BULK_CHANGE_STATUS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          operationId: this.buildOperationIdParam(),
        },
        required: ['operationId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получает статус bulk операции (operationId*). ' +
      'Возвращает текущий статус, прогресс выполнения, количество обработанных задач и ошибки. ' +
      'Статусы: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED. ' +
      'Используется для операций bulk_update_issues, bulk_transition_issues, bulk_move_issues. ' +
      'operationId получается при создании bulk операции.'
    );
  }

  /**
   * Построить описание параметра operationId
   */
  private buildOperationIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'ID операции массового изменения. Получен при создании bulk операции (bulk_update_issues, bulk_transition_issues, bulk_move_issues).',
      {
        minLength: 1,
        examples: ['5f8a7b2c4d3e1f0012345678'],
      }
    );
  }
}
