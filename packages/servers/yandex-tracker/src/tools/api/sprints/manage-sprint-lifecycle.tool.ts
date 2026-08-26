/**
 * MCP Tool для управления жизненным циклом спринта (старт/архивация/удаление)
 */

import { BaseTool, ResponseFieldFilter, ToolWarningCode } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import type { SprintLifecycleAction } from '#tracker_api/dto/index.js';
import { ManageSprintLifecycleParamsSchema } from './manage-sprint-lifecycle.schema.js';

import { MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA } from './manage-sprint-lifecycle.metadata.js';

const ACTION_MESSAGES: Record<SprintLifecycleAction, string> = {
  start: 'запущен',
  archive: 'архивирован',
  delete: 'удалён',
};

export class ManageSprintLifecycleTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA;

  protected override getParamsSchema(): typeof ManageSprintLifecycleParamsSchema {
    return ManageSprintLifecycleParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ManageSprintLifecycleParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { sprintId, action, version, fields } = validation.data;

    try {
      this.logger.info('Управление жизненным циклом спринта', { sprintId, action });

      const sprint = await this.facade.manageSprintLifecycle({ sprintId, action, version });

      // `delete` версии не принимает вовсе (схема отклоняет её `.refine()`) — молчаливого
      // «последний выигрывает» там нет и предупреждать не о чем. У `start`/`archive`
      // версия опциональна: не передана — операция прочитала текущую сама, и правка
      // прошла без блокировки, ровно как у `update_sprint`/`update_component`.
      const lockWarnings =
        action !== 'delete' && version === undefined
          ? [
              {
                code: ToolWarningCode.VERSION_NOT_PROVIDED,
                message:
                  'Версия не передана: операция прочитала текущую сама и применила действие ' +
                  'без блокировки. Если в это время шла чужая параллельная правка, она могла ' +
                  'быть перезаписана незаметно. Передавай version из поля version спринта, ' +
                  'чтобы получить отказ вместо тихой перезаписи.',
              },
            ]
          : [];

      // `delete` отдаёт `null` (204 без тела) — фильтровать нечего, и предупреждение
      // о недостающих полях было бы ложным сигналом: поля не то что отсутствуют в
      // ответе, ответа не существует вовсе.
      if (sprint === null) {
        return this.formatSuccess(
          {
            sprintId,
            action,
            sprint: null,
            message: `Спринт ${sprintId} успешно ${ACTION_MESSAGES[action]}`,
          },
          lockWarnings
        );
      }

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<SprintWithUnknownFields>(sprint, fields);

      return this.formatSuccess(
        {
          sprintId,
          action,
          sprint: filtered,
          message: `Спринт ${sprintId} успешно ${ACTION_MESSAGES[action]}`,
        },
        [...ResponseFieldFilter.toWarnings(fieldsWithoutValue), ...lockWarnings]
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при выполнении действия "${action}" над спринтом ${sprintId}`,
        error
      );
    }
  }
}
