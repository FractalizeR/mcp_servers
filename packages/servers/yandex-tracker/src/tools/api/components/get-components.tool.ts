/**
 * MCP Tool для получения списка компонентов очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ComponentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetComponentsParamsSchema, GetComponentsOutputSchema } from './get-components.schema.js';

import { GET_COMPONENTS_TOOL_METADATA } from './get-components.metadata.js';

/**
 * Инструмент для получения списка компонентов очереди
 */
export class GetComponentsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_COMPONENTS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetComponentsParamsSchema {
    return GetComponentsParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Компоненты очереди',
      outputSchema: GetComponentsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetComponentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, fields } = validation.data;

    try {
      this.logger.info('Получение списка компонентов очереди', {
        queueId,
      });

      // Эндпоинт компонентов не пагинируется — возвращает все компоненты
      // очереди за один ответ.
      const result = await this.facade.getComponents({ queueId });

      // Фильтрация полей для каждого компонента
      const filteredComponents = result.items.map((component) =>
        ResponseFieldFilter.filter<ComponentWithUnknownFields>(component, fields)
      );

      this.logger.info('Список компонентов получен', {
        count: result.items.length,
        queueId,
      });

      return this.formatSuccess({
        components: filteredComponents,
        count: filteredComponents.length,
        queueId,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка компонентов', error);
    }
  }
}
