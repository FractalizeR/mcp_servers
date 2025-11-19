/**
 * Определение MCP tool для получения статуса bulk операции
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetBulkChangeStatusTool } from './get-bulk-change-status.tool.js';

/**
 * Definition для GetBulkChangeStatusTool
 */
export class GetBulkChangeStatusDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetBulkChangeStatusTool.METADATA;
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
      'Получить статус выполнения асинхронной bulk операции (массовое обновление, переход или перемещение). ' +
      'Операция возвращает текущий статус, прогресс выполнения, количество обработанных задач и ошибки (если есть). ' +
      '\n\n' +
      'Статусы операции: ' +
      '\n- PENDING: операция в очереди на выполнение ' +
      '\n- RUNNING: операция выполняется ' +
      '\n- COMPLETED: операция успешно завершена ' +
      '\n- FAILED: операция завершена с ошибкой ' +
      '\n- CANCELLED: операция отменена ' +
      '\n\n' +
      'Для: проверки статуса операций bulk_update_issues, bulk_transition_issues, bulk_move_issues. ' +
      '\n' +
      'Используй operationId, полученный при создании bulk операции.'
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
