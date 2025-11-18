/**
 * MCP Tool для создания компонента в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { CreateComponentDefinition } from './create-component.definition.js';
import { CreateComponentParamsSchema } from './create-component.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

/**
 * Инструмент для создания компонента
 */
export class CreateComponentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('create_component', MCP_TOOL_PREFIX),
    description: '[Components/Write] Создать компонент',
    category: ToolCategory.COMPONENTS,
    subcategory: 'write',
    priority: ToolPriority.HIGH,
    tags: ['components', 'create', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new CreateComponentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateComponentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, name, description, lead, assignAuto } = validation.data;

    try {
      this.logger.info('Создание компонента', {
        queueId,
        name,
        hasDescription: !!description,
        hasLead: !!lead,
        assignAuto: assignAuto ?? false,
      });

      const component = await this.facade.createComponent({
        queueId,
        name,
        description,
        lead,
        assignAuto,
      });

      this.logger.info('Компонент создан', {
        componentId: component.id,
        name: component.name,
      });

      return this.formatSuccess({
        component,
        message: `Компонент "${name}" успешно создан`,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании компонента', error as Error);
    }
  }
}
