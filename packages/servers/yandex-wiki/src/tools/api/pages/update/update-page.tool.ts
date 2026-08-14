import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { UpdatePageParamsSchema } from './update-page.schema.js';
import { UPDATE_PAGE_TOOL_METADATA } from './update-page.metadata.js';
import { detectYfmMarkerLoss } from '../../../shared/yfm-markers.js';

export class UpdatePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdatePageParamsSchema {
    return UpdatePageParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdatePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, title, content, redirect, allow_merge, fields, is_silent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обновление страницы', 1);

      // Пакет 7.1.D: перезапись content — единственная операция без
      // recovery_token, поэтому именно здесь (не в append_content, который
      // только добавляет и не может УМЕНЬШИТЬ число маркеров) читаем текущее
      // содержимое и сравниваем маркеры YFM до записи.
      const warnings =
        content !== undefined ? await this.detectMarkupLoss(idx, content) : undefined;

      const page = await this.facade.updatePage({
        idx,
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(redirect !== undefined && {
            redirect: {
              page: {
                ...(redirect.page.id !== undefined && { id: redirect.page.id }),
                ...(redirect.page.slug !== undefined && { slug: redirect.page.slug }),
              },
            },
          }),
        },
        ...(allow_merge !== undefined && { allow_merge }),
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Страница ${idx} успешно обновлена`,
        page,
        ...(warnings !== undefined && warnings.length > 0 && { warnings }),
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении страницы: ${idx}`, error);
    }
  }

  /**
   * Читает текущее содержимое страницы и сравнивает число структурных
   * маркеров YFM с предлагаемым новым содержимым. Не бросает исключение при
   * сбое чтения — предупреждение необязательный сервис, не должен мешать
   * основной операции обновления.
   */
  private async detectMarkupLoss(idx: number, newContent: string): Promise<string[]> {
    try {
      const currentPage = await this.facade.getPageById({ idx, fields: 'content' });
      const currentContent = typeof currentPage?.content === 'string' ? currentPage.content : '';
      return detectYfmMarkerLoss(currentContent, newContent);
    } catch {
      return [];
    }
  }
}
