/**
 * MCP Tool для получения записей времени задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get worklogs)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { WorklogWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetWorklogsDefinition } from '@tools/api/worklog/get/get-worklogs.definition.js';
import { GetWorklogsParamsSchema } from '@tools/api/worklog/get/get-worklogs.schema.js';

import { GET_WORKLOGS_TOOL_METADATA } from './get-worklogs.metadata.js';

/**
 * Инструмент для получения записей времени задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения записей времени
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class GetWorklogsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_WORKLOGS_TOOL_METADATA;

  private readonly definition = new GetWorklogsDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetWorklogsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Получение записей времени задачи', {
        issueId,
      });

      // 3. API v2: получение записей времени
      const worklogs = await this.facade.getWorklogs(issueId);

      // 4. Фильтрация полей ответа
      const filteredWorklogs = worklogs.map((worklog) =>
        ResponseFieldFilter.filter<WorklogWithUnknownFields>(worklog, fields)
      );

      // 5. Логирование результата
      this.logger.info('Записи времени успешно получены', {
        issueId,
        worklogsCount: worklogs.length,
      });

      return this.formatSuccess({
        data: filteredWorklogs,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении записей времени задачи ${issueId}`,
        error as Error
      );
    }
  }
}
