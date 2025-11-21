/**
 * MCP Tool для управления доступом к очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ManageQueueAccessParamsSchema } from './manage-queue-access.schema.js';

import type { QueuePermissionWithUnknownFields } from '#tracker_api/entities/index.js';
import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from './manage-queue-access.metadata.js';

export class ManageQueueAccessTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = MANAGE_QUEUE_ACCESS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof ManageQueueAccessParamsSchema {
    return ManageQueueAccessParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ManageQueueAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, queueId, role, subjects, action } = validation.data;

    try {
      this.logger.info('Управление доступом к очереди', {
        queueId,
        role,
        subjectsCount: subjects.length,
        action,
      });

      const permissions = await this.facade.manageQueueAccess({
        queueId,
        accessData: { role, subjects, action },
      });

      this.logger.info('Права доступа успешно обновлены', {
        queueId,
        action,
        subjectsCount: subjects.length,
      });

      const filteredPermissions = permissions.map((permission) =>
        ResponseFieldFilter.filter<QueuePermissionWithUnknownFields>(permission, fields)
      );

      return this.formatSuccess({
        queueId,
        role,
        action,
        subjectsProcessed: subjects.length,
        permissions: filteredPermissions,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при управлении доступом к очереди ${queueId}`,
        error as Error
      );
    }
  }
}
