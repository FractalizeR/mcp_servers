/**
 * MCP Tool для управления доступом к очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ManageQueueAccessParamsSchema } from './manage-queue-access.schema.js';

import type { QueuePermissionsWithUnknownFields } from '#tracker_api/entities/index.js';
import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from './manage-queue-access.metadata.js';

export class ManageQueueAccessTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = MANAGE_QUEUE_ACCESS_TOOL_METADATA;

  protected override getParamsSchema(): typeof ManageQueueAccessParamsSchema {
    return ManageQueueAccessParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ManageQueueAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, queueId, permission, subjectKind, subjects, action } = validation.data;

    try {
      this.logger.info('Управление доступом к очереди', {
        queueId,
        permission,
        subjectKind,
        subjectsCount: subjects.length,
        action,
      });

      const permissions = await this.facade.manageQueueAccess({
        queueId,
        accessData: { permission, subjectKind, subjects, action },
      });

      this.logger.info('Права доступа успешно обновлены', {
        queueId,
        action,
        subjectsCount: subjects.length,
      });

      const { result: filteredPermissions, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<QueuePermissionsWithUnknownFields>(
          permissions,
          fields
        );

      return this.formatSuccess(
        {
          queueId,
          permission,
          subjectKind,
          action,
          subjectsSent: subjects.length,
          permissions: filteredPermissions,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при управлении доступом к очереди ${queueId}`, error);
    }
  }
}
