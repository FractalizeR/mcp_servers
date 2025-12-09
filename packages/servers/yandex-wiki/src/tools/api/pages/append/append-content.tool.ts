import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { AppendContentDto, InsertLocation } from '#wiki_api/dto/index.js';
import { AppendContentParamsSchema } from './append-content.schema.js';
import { APPEND_CONTENT_TOOL_METADATA } from './append-content.metadata.js';

export class AppendContentTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = APPEND_CONTENT_TOOL_METADATA;

  protected override getParamsSchema(): typeof AppendContentParamsSchema {
    return AppendContentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AppendContentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const {
      idx,
      content,
      body_location,
      section_id,
      section_location,
      anchor_name,
      anchor_fallback,
      anchor_regex,
      fields,
      is_silent,
    } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Добавление контента', 1);

      const data: AppendContentDto = { content };

      if (body_location) {
        data.body = { location: body_location as InsertLocation };
      }

      if (section_id !== undefined && section_location) {
        data.section = { id: section_id, location: section_location as InsertLocation };
      }

      if (anchor_name) {
        data.anchor = {
          name: anchor_name,
          ...(anchor_fallback !== undefined && { fallback: anchor_fallback }),
          ...(anchor_regex !== undefined && { regex: anchor_regex }),
        };
      }

      const page = await this.facade.appendContent({
        idx,
        data,
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Контент успешно добавлен к странице ${idx}`,
        page,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении контента к странице: ${idx}`, error);
    }
  }
}
