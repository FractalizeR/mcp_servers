/**
 * MCP Tool для получения списка компонентов очереди в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetComponentsDefinition } from './get-components.definition.js';
import { GetComponentsParamsSchema } from './get-components.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

/**
 * Инструмент для получения списка компонентов очереди
 */
export class GetComponentsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('get_components', MCP_TOOL_PREFIX),
    description: '[Components/Read] Получить список компонентов очереди',
    category: ToolCategory.COMPONENTS,
    subcategory: 'read',
    priority: ToolPriority.HIGH,
    tags: ['components', 'list', 'read', 'queue'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

  private readonly definition = new GetComponentsDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetComponentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId } = validation.data;

    try {
      this.logger.info('Получение списка компонентов очереди', {
        queueId,
      });

      const components = await this.facade.getComponents({ queueId });

      this.logger.info('Список компонентов получен', {
        count: components.length,
        queueId,
      });

      return this.formatSuccess({
        components,
        count: components.length,
        queueId,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка компонентов', error as Error);
    }
  }
}
