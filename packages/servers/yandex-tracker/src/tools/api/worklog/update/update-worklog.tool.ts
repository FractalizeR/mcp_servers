/**
 * MCP Tool для обновления записи времени
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (update worklog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Автоматическая конвертация duration в ISO 8601
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateWorklogParamsSchema } from '#tools/api/worklog/update/update-worklog.schema.js';

import { UPDATE_WORKLOG_TOOL_METADATA } from './update-worklog.metadata.js';

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
  static override readonly METADATA = UPDATE_WORKLOG_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateWorklogParamsSchema {
    return UpdateWorklogParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UpdateWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, worklogId, start, duration, comment, fields } = validation.data;

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

      // 4. Фильтрация полей ответа
      const filteredWorklog = ResponseFieldFilter.filter<WorklogWithUnknownFields>(worklog, fields);

      // 5. Логирование результата
      this.logger.info('Запись времени успешно обновлена', {
        issueId,
        worklogId,
        duration: worklog.duration,
      });

      return this.formatSuccess({
        data: filteredWorklog,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении записи времени ${worklogId} задачи ${issueId}`,
        error
      );
    }
  }
}
