/**
 * MCP Tool для получения справочника типов задач
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { IssueTypeWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueTypesParamsSchema } from './get-issue-types.schema.js';

import { GET_ISSUE_TYPES_TOOL_METADATA } from './get-issue-types.metadata.js';

export class GetIssueTypesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_ISSUE_TYPES_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetIssueTypesParamsSchema {
    return GetIssueTypesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetIssueTypesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение справочника типов задач');

      const result = await this.facade.getIssueTypes();

      const filtered = result.items.map((item) =>
        ResponseFieldFilter.filter<IssueTypeWithUnknownFields>(item, fields)
      );

      return this.formatSuccess({
        issueTypes: filtered,
        count: filtered.length,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении справочника типов задач', error);
    }
  }
}
