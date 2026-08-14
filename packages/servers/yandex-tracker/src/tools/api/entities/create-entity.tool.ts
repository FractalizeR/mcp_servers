/**
 * MCP Tool для создания записи Entity API (Goal/Project/Portfolio)
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateEntityParamsSchema } from './create-entity.schema.js';

import { CREATE_ENTITY_TOOL_METADATA } from './create-entity.metadata.js';

export class CreateEntityTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_ENTITY_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateEntityParamsSchema {
    return CreateEntityParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateEntityParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { entityType, name, description, extraFields, fields } = validation.data;

    try {
      this.logger.info('Создание записи Entity API', { entityType, name });

      const entity = await this.facade.createEntity({
        entityType,
        name,
        description,
        extraFields,
      });

      const filtered = ResponseFieldFilter.filter<EntityApiRecordWithUnknownFields>(entity, fields);

      this.logger.info('Запись Entity API создана', { entityType, entityId: entity.id });

      return this.formatSuccess({
        entity: filtered,
        message: `Запись "${name}" (${entityType}) успешно создана`,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании записи Entity API (${entityType})`, error);
    }
  }
}
