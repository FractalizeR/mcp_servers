/**
 * MCP Tool для добавления записи времени к задаче
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (add worklog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Автоматическая конвертация duration в ISO 8601
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { AddWorklogParamsSchema } from '#tools/api/worklog/add/add-worklog.schema.js';

import { ADD_WORKLOG_TOOL_METADATA } from './add-worklog.metadata.js';

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
  static override readonly METADATA = ADD_WORKLOG_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof AddWorklogParamsSchema {
    return AddWorklogParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, start, duration, comment, fields } = validation.data;

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

      // 4. Фильтрация полей ответа
      const filteredWorklog = ResponseFieldFilter.filter<WorklogWithUnknownFields>(worklog, fields);

      // 5. Логирование результата
      this.logger.info('Запись времени успешно добавлена', {
        issueId,
        worklogId: worklog.id,
        duration: worklog.duration,
      });

      return this.formatSuccess({
        data: filteredWorklog,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении записи времени к задаче ${issueId}`, error);
    }
  }
}
