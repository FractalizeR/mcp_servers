/**
 * MCP Tool для поиска/списка записей Entity API (Goal/Project/Portfolio)
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import { FindEntitiesParamsSchema } from './find-entities.schema.js';

import { FIND_ENTITIES_TOOL_METADATA } from './find-entities.metadata.js';

export class FindEntitiesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = FIND_ENTITIES_TOOL_METADATA;

  protected override getParamsSchema(): typeof FindEntitiesParamsSchema {
    return FindEntitiesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, FindEntitiesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { entityType, fields, ...searchParams } = validation.data;

    try {
      this.logger.info('Поиск записей Entity API', { entityType });

      const result = await this.facade.findEntities({ entityType, ...searchParams });

      const filteredEntities = result.items.map((entity) =>
        ResponseFieldFilter.filter<EntityApiRecordWithUnknownFields>(entity, fields)
      );

      this.logger.info('Записи Entity API найдены', {
        entityType,
        count: filteredEntities.length,
      });

      return this.formatSuccess({
        entities: filteredEntities,
        count: filteredEntities.length,
        entityType,
        pagination: result.pagination,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при поиске записей Entity API (${entityType})`, error);
    }
  }
}
