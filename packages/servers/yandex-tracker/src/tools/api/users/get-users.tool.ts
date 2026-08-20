/**
 * MCP Tool для получения нескольких пользователей по login/uid (batch)
 */

import {
  BaseTool,
  ResponseFieldFilter,
  BatchResultProcessor,
  ResultLogger,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { UserWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetUsersParamsSchema } from './get-users.schema.js';

import { GET_USERS_TOOL_METADATA } from './get-users.metadata.js';

export class GetUsersTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_USERS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetUsersParamsSchema {
    return GetUsersParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetUsersParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { userIds, fields } = validation.data;

    try {
      ResultLogger.logOperationStart(
        this.logger,
        'Получение пользователей',
        userIds.length,
        fields
      );

      const results = await this.facade.getUsers(userIds);

      // Обрабатываем batch БЕЗ фильтрации на этом шаге — фильтрация одним
      // вызовом ниже нужна, чтобы filterWithReport увидел все успешные
      // элементы разом и посчитал fieldsWithoutValue корректно (поле "без
      // значения", только если пусто у ВСЕХ успешных элементов — см. README
      // плана `plan_tool_contract_unification` §4), а не по одному элементу
      // за раз, что дало бы предупреждение уже на первом элементе без поля.
      const processedResults = BatchResultProcessor.process(results);

      const rawUsers = processedResults.successful.map((item) => item.data);
      const { result: filteredUsers, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        UserWithUnknownFields[]
      >(rawUsers, fields);

      ResultLogger.logBatchResults(
        this.logger,
        'Пользователи получены',
        {
          totalRequested: userIds.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        {
          total: userIds.length,
          successful: processedResults.successful.map((item, index) => ({
            userId: item.key,
            user: filteredUsers[index],
          })),
          failed: processedResults.failed.map((item) => ({
            userId: item.key,
            error: item.error,
          })),
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении пользователей (${userIds.length} шт.)`, error);
    }
  }
}
