/**
 * MCP Tool для получения списка проектов в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetProjectsParamsSchema } from './get-projects.schema.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';

import { GET_PROJECTS_TOOL_METADATA } from './get-projects.metadata.js';

export class GetProjectsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_PROJECTS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetProjectsParamsSchema {
    return GetProjectsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, perPage, cursor, expand, queueId, fetchAll, maxItems } = validation.data;

    try {
      this.logger.info('Получение списка проектов', {
        perPage: perPage ?? 50,
        expand: expand ?? 'none',
        queueId: queueId ?? 'all',
      });

      const result = await this.facade.getProjects({
        perPage,
        cursor,
        expand,
        queueId,
        fetchAll,
        maxItems,
      });

      // `total` — ТОЛЬКО реальное значение из заголовка X-Total-Count.
      // Не подделываем длиной страницы (исходный баг). Если сервер total не
      // прислал — поля нет; ориентир `pagination.hasNextPage`. Количество
      // элементов на этой странице — в `count`.
      const total = result.pagination.total;

      this.logger.info('Список проектов получен', {
        count: result.items.length,
        ...(total !== undefined ? { total } : {}),
      });

      const { result: filteredProjects, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        ProjectWithUnknownFields[]
      >(result.items, fields);

      return this.formatSuccess(
        {
          projects: filteredProjects,
          ...(total !== undefined ? { total } : {}),
          count: filteredProjects.length,
          pagination: result.pagination,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка проектов', error);
    }
  }
}
