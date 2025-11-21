/**
 * MCP Tool для обновления компонента в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
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

    const { componentId, name, description, lead, assignAuto, fields } = validation.data;

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
      });

      // Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<ComponentWithUnknownFields>(component, fields);

      this.logger.info('Компонент обновлен', {
        componentId: component.id,
        name: component.name,
      });

      return this.formatSuccess({
        component: filtered,
        message: `Компонент ${componentId} успешно обновлен`,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при обновлении компонента', error as Error);
    }
  }
}
