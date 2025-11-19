/**
 * MCP Tool для создания компонента в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ComponentWithUnknownFields } from '@tracker_api/entities/index.js';
import { CreateComponentDefinition } from './create-component.definition.js';
import { CreateComponentParamsSchema } from './create-component.schema.js';

import { CREATE_COMPONENT_TOOL_METADATA } from './create-component.metadata.js';

/**
 * Инструмент для создания компонента
 */
export class CreateComponentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_COMPONENT_TOOL_METADATA;

  private readonly definition = new CreateComponentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateComponentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, name, description, lead, assignAuto, fields } = validation.data;

    try {
      this.logger.info('Создание компонента', {
        queueId,
        name,
        hasDescription: !!description,
        hasLead: !!lead,
        assignAuto: assignAuto ?? false,
      });

      const component: ComponentWithUnknownFields = await this.facade.createComponent({
        queueId,
        name,
        description,
        lead,
        assignAuto,
      });

      // Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<ComponentWithUnknownFields>(component, fields);

      this.logger.info('Компонент создан', {
        componentId: component.id,
        name: component.name,
      });

      return this.formatSuccess({
        component: filtered,
        message: `Компонент "${name}" успешно создан`,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании компонента', error as Error);
    }
  }
}
