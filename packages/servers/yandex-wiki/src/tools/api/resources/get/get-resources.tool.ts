import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { Resource } from '#wiki_api/entities/index.js';
import {
  buildPageItemResourceUri,
  extractResourceItemName,
  extractResourceItemSize,
  type LinkableResourceType,
} from '#resources/index.js';
import { GetResourcesParamsSchema } from './get-resources.schema.js';
import { GET_RESOURCES_TOOL_METADATA } from './get-resources.metadata.js';

/**
 * Ресурс НЕ является таблицей (grid) — таблицы вне ResourceLink, см.
 * `#resources/wiki-page-item-resource.provider.ts`.
 */
function isLinkableResource(
  resource: Resource
): resource is Resource & { type: LinkableResourceType } {
  return resource.type !== 'grid';
}

export class GetResourcesTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_RESOURCES_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetResourcesParamsSchema {
    return GetResourcesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetResourcesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, cursor, order_by, order_direction, page_id, page_size, q, types, responseMode } =
      validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение ресурсов страницы', 1);

      const response = await this.facade.getResources({
        idx,
        ...(cursor !== undefined && { cursor }),
        ...(order_by !== undefined && { order_by }),
        ...(order_direction !== undefined && { order_direction }),
        ...(page_id !== undefined && { page_id }),
        ...(page_size !== undefined && { page_size }),
        ...(q !== undefined && { q }),
        ...(types !== undefined && { types }),
      });

      // Защита от неполного/некорректного ответа API (results не является
      // массивом): без неё .filter() бросил бы TypeError вместо formatError.
      const results = Array.isArray(response.results) ? response.results : [];

      // Таблицы (grid) исключены из механизма ResourceLink — заморожены
      // решением этапа 7.1 (см. GET_RESOURCES_TOOL_METADATA.description).
      // Они всегда попадают в summary.gridItems полными объектами,
      // независимо от responseMode.
      const gridItems = results.filter((r) => !isLinkableResource(r));
      const linkableItems = results.filter(isLinkableResource);

      let anonymousCounter = 0;
      const toResourceLink = (
        item: Resource & { type: LinkableResourceType }
      ): ResourceLinkDescriptor => {
        const name = extractResourceItemName(item.item) ?? `resource-${anonymousCounter++}`;
        const size = extractResourceItemSize(item.item);

        // Намеренно БЕЗ description/title: любой лишний текст в дескрипторе
        // съедает часть экономии, ради которой существует режим links —
        // uri/name/size достаточно, чтобы агент решил, читать ли тело.
        return {
          uri: buildPageItemResourceUri(idx, item.type, name),
          name,
          ...(size !== undefined && { size }),
        };
      };

      return this.formatCollectionResult({
        items: linkableItems,
        mode: responseMode,
        toResourceLink,
        summary: {
          gridItems,
          ...(response.next_cursor !== undefined && { next_cursor: response.next_cursor }),
          ...(response.prev_cursor !== undefined && { prev_cursor: response.prev_cursor }),
        },
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении ресурсов страницы: ${idx}`, error);
    }
  }
}
