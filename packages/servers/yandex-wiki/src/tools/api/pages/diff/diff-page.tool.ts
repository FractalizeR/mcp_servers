import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DiffPageParamsSchema } from './diff-page.schema.js';
import { DIFF_PAGE_TOOL_METADATA } from './diff-page.metadata.js';
import { computeLineDiff, summarizeLineDiff } from '../../../shared/line-diff.js';

/**
 * DiffPageTool (пакет 3.1.E) — построчное сравнение текущего содержимого
 * страницы Wiki с предлагаемым новым содержимым. Read-only: только вызывает
 * getPageById для чтения, ничего не пишет. Предназначен для использования
 * перед update_page — агент видит фактическую разницу и подтверждает её,
 * прежде чем сохранить.
 */
export class DiffPageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DIFF_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof DiffPageParamsSchema {
    return DiffPageParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DiffPageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, newContent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Сравнение страницы с новым содержимым', 1);

      const page = await this.facade.getPageById({
        idx,
        fields: 'content,title,slug',
      });

      const currentContent = typeof page.content === 'string' ? page.content : '';
      const lines = computeLineDiff(currentContent, newContent);
      const summary = summarizeLineDiff(lines);

      return this.formatSuccess({
        pageId: idx,
        ...(page.slug !== undefined && { slug: page.slug }),
        ...(page.title !== undefined && { title: page.title }),
        hasChanges: summary.linesAdded > 0 || summary.linesRemoved > 0,
        summary,
        lines,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при сравнении страницы: ${idx}`, error);
    }
  }
}
