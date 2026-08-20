/**
 * MCP Tool для получения списка пользователей организации
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { UserWithUnknownFields } from '#tracker_api/entities/index.js';
import { FindUsersParamsSchema } from './find-users.schema.js';

import { FIND_USERS_TOOL_METADATA } from './find-users.metadata.js';

export class FindUsersTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = FIND_USERS_TOOL_METADATA;

  protected override getParamsSchema(): typeof FindUsersParamsSchema {
    return FindUsersParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, FindUsersParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, perPage, cursor, fetchAll, maxItems } = validation.data;

    try {
      this.logger.info('Получение списка пользователей организации');

      const result = await this.facade.findUsers({ perPage, cursor, fetchAll, maxItems });

      const { result: filteredUsers, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        UserWithUnknownFields[]
      >(result.items, fields);

      this.logger.info('Список пользователей получен', { count: filteredUsers.length });

      return this.formatSuccess(
        {
          users: filteredUsers,
          count: filteredUsers.length,
          pagination: result.pagination,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка пользователей', error);
    }
  }
}
