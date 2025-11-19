/**
 * MCP Tool для получения списка компонентов очереди в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetComponentsDefinition } from './get-components.definition.js';
import { GetComponentsParamsSchema } from './get-components.schema.js';

import { GET_COMPONENTS_TOOL_METADATA } from './get-components.metadata.js';

/**
 * Инструмент для получения списка компонентов очереди
 */
export class GetComponentsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_COMPONENTS_TOOL_METADATA;

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
