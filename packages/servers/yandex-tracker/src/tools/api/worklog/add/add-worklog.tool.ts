/**
 * MCP Tool для добавления записи времени к задаче
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (add worklog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Автоматическая конвертация duration в ISO 8601
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { AddWorklogDefinition } from '@tools/api/worklog/add/add-worklog.definition.js';
import { AddWorklogParamsSchema } from '@tools/api/worklog/add/add-worklog.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Инструмент для добавления записи времени к задаче
 *
 * Ответственность (SRP):
 * - Координация процесса добавления записи времени
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class AddWorklogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('add_worklog', MCP_TOOL_PREFIX),
    description: '[Worklog/Create] Добавить запись времени к задаче',
    category: ToolCategory.ISSUES,
    subcategory: 'worklog',
    priority: ToolPriority.HIGH,
    tags: ['worklog', 'add', 'create', 'time', 'log'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

  private readonly definition = new AddWorklogDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, start, duration, comment } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Добавление записи времени к задаче', {
        issueId,
        start,
        duration,
        hasComment: !!comment,
      });

      // 3. API v2: добавление записи времени
      // DurationUtil автоматически конвертирует human-readable формат в ISO 8601
      const worklog = await this.facade.addWorklog(issueId, {
        start,
        duration,
        comment,
      });

      // 4. Логирование результата
      this.logger.info('Запись времени успешно добавлена', {
        issueId,
        worklogId: worklog.id,
        duration: worklog.duration,
      });

      return this.formatSuccess({
        issueId,
        worklog,
        message: `Запись времени успешно добавлена к задаче ${issueId}`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении записи времени к задаче ${issueId}`,
        error as Error
      );
    }
  }
}
