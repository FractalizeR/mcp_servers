import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SearchResult } from '#wiki_api/entities/index.js';
import { SearchParamsSchema } from './search.schema.js';
import { SEARCH_TOOL_METADATA } from './search.metadata.js';

export class SearchTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = SEARCH_TOOL_METADATA;

  protected override getParamsSchema(): typeof SearchParamsSchema {
    return SearchParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, SearchParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { query, cursor, limit, order_by, highlight, filters, responseMode } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Полнотекстовый поиск по Wiki', 1);

      const response = await this.facade.search({
        query,
        ...(cursor !== undefined && { cursor }),
        ...(limit !== undefined && { limit }),
        ...(order_by !== undefined && { order_by }),
        ...(highlight !== undefined && { highlight }),
        ...(filters !== undefined && { filters }),
      });

      // Защита от неполного/некорректного ответа API (results не является
      // массивом) — тот же паттерн, что у GetResourcesTool.
      const results = Array.isArray(response.results) ? response.results : [];

      let anonymousCounter = 0;
      const toResourceLink = (item: SearchResult): ResourceLinkDescriptor => {
        const name = item.title ?? item.slug ?? item.url ?? `result-${anonymousCounter++}`;
        // Страницы адресуются существующим ресурсом wiki://page/{slug}
        // (WikiPageResourceProvider, пакет 5.1.C.wiki) — тело читается через
        // resources/read. У результатов без slug (файлы/сторонние ресурсы)
        // устойчивого адреса в нашей схеме ресурсов нет — используем url
        // как есть (внешняя ссылка, НЕ резолвится нашим resources/read).
        const uri =
          item.slug !== undefined
            ? `wiki://page/${item.slug}`
            : (item.url ?? `wiki://search-result/${anonymousCounter}`);

        return { uri, name };
      };

      return this.formatCollectionResult({
        items: results,
        mode: responseMode,
        toResourceLink,
        summary: {
          ...(response.next_cursor !== undefined && { next_cursor: response.next_cursor }),
          ...(response.prev_cursor !== undefined && { prev_cursor: response.prev_cursor }),
        },
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при поиске по Wiki: ${query}`, error);
    }
  }
}
