/**
 * MCP Tool для получения одной записи Entity API (Goal/Project/Portfolio)
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetEntityParamsSchema } from './get-entity.schema.js';
import { extractEntityApiFields } from './entity-api-fields.util.js';

import { GET_ENTITY_TOOL_METADATA } from './get-entity.metadata.js';

export class GetEntityTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_ENTITY_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetEntityParamsSchema {
    return GetEntityParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetEntityParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { entityType, entityId, fields } = validation.data;

    try {
      this.logger.info('Получение записи Entity API', { entityType, entityId });

      const entity = await this.facade.getEntity({
        entityType,
        entityId,
        entityFields: extractEntityApiFields(fields),
      });

      const filtered = ResponseFieldFilter.filter<EntityApiRecordWithUnknownFields>(entity, fields);

      return this.formatSuccess({
        entity: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении записи Entity API ${entityType}/${entityId}`,
        error
      );
    }
  }
}
