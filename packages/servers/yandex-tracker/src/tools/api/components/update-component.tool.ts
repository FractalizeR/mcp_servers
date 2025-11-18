/**
 * MCP Tool для обновления компонента в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdateComponentDefinition } from './update-component.definition.js';
import { UpdateComponentParamsSchema } from './update-component.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

/**
 * Инструмент для обновления компонента
 */
export class UpdateComponentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('update_component', MCP_TOOL_PREFIX),
    description: '[Components/Write] Обновить компонент',
    category: ToolCategory.COMPONENTS,
    subcategory: 'write',
    priority: ToolPriority.HIGH,
    tags: ['components', 'update', 'write', 'modify'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new UpdateComponentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateComponentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { componentId, name, description, lead, assignAuto } = validation.data;

    try {
      this.logger.info('Обновление компонента', {
        componentId,
        hasName: !!name,
        hasDescription: description !== undefined,
        hasLead: !!lead,
        hasAssignAuto: assignAuto !== undefined,
      });

      const component = await this.facade.updateComponent({
        componentId,
        name,
        description,
        lead,
        assignAuto,
      });

      this.logger.info('Компонент обновлен', {
        componentId: component.id,
        name: component.name,
      });

      return this.formatSuccess({
        component,
        message: `Компонент ${componentId} успешно обновлен`,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при обновлении компонента', error as Error);
    }
  }
}
