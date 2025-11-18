/**
 * MCP Tool для обновления записи времени
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (update worklog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Автоматическая конвертация duration в ISO 8601
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdateWorklogDefinition } from '@tools/api/worklog/update/update-worklog.definition.js';
import { UpdateWorklogParamsSchema } from '@tools/api/worklog/update/update-worklog.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Инструмент для обновления записи времени
 *
 * Ответственность (SRP):
 * - Координация процесса обновления записи времени
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class UpdateWorklogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('update_worklog', MCP_TOOL_PREFIX),
    description: '[Worklog/Update] Обновить запись времени задачи',
    category: ToolCategory.ISSUES,
    subcategory: 'worklog',
    priority: ToolPriority.HIGH,
    tags: ['worklog', 'update', 'edit', 'modify', 'time'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

  private readonly definition = new UpdateWorklogDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UpdateWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, worklogId, start, duration, comment } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Обновление записи времени', {
        issueId,
        worklogId,
        hasStart: !!start,
        hasDuration: !!duration,
        hasComment: !!comment,
      });

      // 3. API v2: обновление записи времени
      // DurationUtil автоматически конвертирует human-readable формат в ISO 8601
      const worklog = await this.facade.updateWorklog(issueId, worklogId, {
        start,
        duration,
        comment,
      });

      // 4. Логирование результата
      this.logger.info('Запись времени успешно обновлена', {
        issueId,
        worklogId,
        duration: worklog.duration,
      });

      return this.formatSuccess({
        issueId,
        worklogId,
        worklog,
        message: `Запись времени ${worklogId} задачи ${issueId} успешно обновлена`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении записи времени ${worklogId} задачи ${issueId}`,
        error as Error
      );
    }
  }
}
