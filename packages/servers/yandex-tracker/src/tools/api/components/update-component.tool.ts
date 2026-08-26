/**
 * MCP Tool для обновления компонента в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter, ToolWarningCode } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ComponentWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateComponentParamsSchema } from './update-component.schema.js';

import { UPDATE_COMPONENT_TOOL_METADATA } from './update-component.metadata.js';

/**
 * Инструмент для обновления компонента
 */
export class UpdateComponentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_COMPONENT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateComponentParamsSchema {
    return UpdateComponentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateComponentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { componentId, name, description, lead, assignAuto, version, fields } = validation.data;

    try {
      this.logger.info('Обновление компонента', {
        componentId,
        hasName: !!name,
        hasDescription: description !== undefined,
        hasLead: !!lead,
        hasAssignAuto: assignAuto !== undefined,
      });

      const component: ComponentWithUnknownFields = await this.facade.updateComponent({
        componentId,
        name,
        description,
        lead,
        assignAuto,
        version,
      });

      // Фильтрация полей ответа
      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<ComponentWithUnknownFields>(component, fields);

      this.logger.info('Компонент обновлен', {
        componentId: component.id,
        name: component.name,
      });

      // Версию не передали — операция прочитала текущую сама и применила правку без
      // блокировки. Молчать об этом нельзя: вызывающий думает, что у него
      // оптимистичная блокировка, а конфликт с чужой правкой разошёлся бы незаметно —
      // код не знает, была ли чужая правка вообще, только то, что защиты не было.
      const lockWarnings =
        version === undefined
          ? [
              {
                code: ToolWarningCode.VERSION_NOT_PROVIDED,
                message:
                  'Версия не передана: операция прочитала текущую сама и применила правку ' +
                  'без блокировки. Если в это время шла чужая параллельная правка, она могла ' +
                  'быть перезаписана незаметно. Передавай version из поля version компонента, ' +
                  'чтобы получить отказ вместо тихой перезаписи.',
              },
            ]
          : [];

      return this.formatSuccess(
        {
          component: filtered,
          message: `Компонент ${componentId} успешно обновлен`,
        },
        [...ResponseFieldFilter.toWarnings(fieldsWithoutValue), ...lockWarnings]
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при обновлении компонента', error);
    }
  }
}
