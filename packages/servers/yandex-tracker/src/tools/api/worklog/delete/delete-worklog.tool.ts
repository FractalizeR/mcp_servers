/**
 * MCP Tool для удаления записи времени
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete worklog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteWorklogDefinition } from '@tools/api/worklog/delete/delete-worklog.definition.js';
import { DeleteWorklogParamsSchema } from '@tools/api/worklog/delete/delete-worklog.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Инструмент для удаления записи времени
 *
 * Ответственность (SRP):
 * - Координация процесса удаления записи времени
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class DeleteWorklogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('delete_worklog', MCP_TOOL_PREFIX),
    description: '[Worklog/Delete] Удалить запись времени задачи',
    category: ToolCategory.ISSUES,
    subcategory: 'worklog',
    priority: ToolPriority.HIGH,
    tags: ['worklog', 'delete', 'remove', 'time'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

  private readonly definition = new DeleteWorklogDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, worklogId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Удаление записи времени', {
        issueId,
        worklogId,
      });

      // 3. API v2: удаление записи времени
      await this.facade.deleteWorklog(issueId, worklogId);

      // 4. Логирование результата
      this.logger.info('Запись времени успешно удалена', {
        issueId,
        worklogId,
      });

      return this.formatSuccess({
        issueId,
        worklogId,
        message: `Запись времени ${worklogId} задачи ${issueId} успешно удалена`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении записи времени ${worklogId} задачи ${issueId}`,
        error as Error
      );
    }
  }
}
