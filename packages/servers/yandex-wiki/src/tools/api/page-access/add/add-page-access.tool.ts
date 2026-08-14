import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { AddPageAccessParamsSchema } from './add-page-access.schema.js';
import { ADD_PAGE_ACCESS_TOOL_METADATA } from './add-page-access.metadata.js';

export class AddPageAccessTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = ADD_PAGE_ACCESS_TOOL_METADATA;

  protected override getParamsSchema(): typeof AddPageAccessParamsSchema {
    return AddPageAccessParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AddPageAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, role, target, inheritance } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Добавление доступа к странице', 1);

      const access = await this.facade.createPageAccess(idx, {
        role,
        ...('user' in target ? { user: target.user } : { group: target.group }),
        ...(inheritance !== undefined && { inheritance }),
      });

      return this.formatSuccess({ idx, access });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении доступа к странице: ${idx}`, error);
    }
  }
}
