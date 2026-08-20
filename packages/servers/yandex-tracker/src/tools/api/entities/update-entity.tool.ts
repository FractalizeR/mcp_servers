/**
 * MCP Tool для обновления записи Entity API (Goal/Project/Portfolio)
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateEntityParamsSchema } from './update-entity.schema.js';

import { UPDATE_ENTITY_TOOL_METADATA } from './update-entity.metadata.js';
import { extractEntityApiFields } from './entity-api-fields.util.js';

export class UpdateEntityTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_ENTITY_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateEntityParamsSchema {
    return UpdateEntityParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateEntityParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { entityType, entityId, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление записи Entity API', { entityType, entityId });

      const entity = await this.facade.updateEntity({
        entityType,
        entityId,
        ...updateData,
        entityFields: extractEntityApiFields(fields),
      });

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<EntityApiRecordWithUnknownFields>(entity, fields);

      return this.formatSuccess(
        {
          entity: filtered,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении записи Entity API ${entityType}/${entityId}`,
        error
      );
    }
  }
}
