/**
 * MCP Tool для обновления спринта в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter, ToolWarningCode } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateSprintParamsSchema } from './update-sprint.schema.js';

import { UPDATE_SPRINT_TOOL_METADATA } from './update-sprint.metadata.js';

export class UpdateSprintTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_SPRINT_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateSprintParamsSchema {
    return UpdateSprintParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateSprintParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    // `version` уходит query-параметром (PATCH /v3/sprints/{id}?version=…), не
    // телом: явная деструктуризация — единственная гарантия, что она не
    // просочится в `updateData` через индексную сигнатуру `UpdateSprintDto`.
    const { sprintId, fields, version, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление спринта', { sprintId });

      const sprint = await this.facade.updateSprint(sprintId, updateData, version);

      this.logger.info('Спринт обновлён', { sprintId: sprint.id });

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<SprintWithUnknownFields>(sprint, fields);

      // Версию не передали — операция прочитала текущую сама и применила правку без
      // блокировки: код не знает, шла ли в это время чужая параллельная правка, —
      // если шла, она могла быть перезаписана незаметно.
      const lockWarnings =
        version === undefined
          ? [
              {
                code: ToolWarningCode.VERSION_NOT_PROVIDED,
                message:
                  'Версия не передана: операция прочитала текущую сама и применила правку ' +
                  'без блокировки. Если в это время шла чужая параллельная правка, она могла ' +
                  'быть перезаписана незаметно. Передавай version из поля version спринта, ' +
                  'чтобы получить отказ вместо тихой перезаписи.',
              },
            ]
          : [];

      return this.formatSuccess(
        {
          sprint: filtered,
        },
        [...ResponseFieldFilter.toWarnings(fieldsWithoutValue), ...lockWarnings]
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении спринта ${sprintId}`, error);
    }
  }
}
