/**
 * MCP Tool для поиска задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (POST /v3/issues/_search)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ResponseFieldFilter, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { FindIssuesParamsSchema } from '#tools/api/issues/find/find-issues.schema.js';
import { buildIssueResourceUri } from '#resources/tracker-resource-uri.js';

import { FIND_ISSUES_TOOL_METADATA } from './find-issues.metadata.js';

/**
 * Поля, гарантированно присутствующие в отфильтрованном issue независимо от
 * запрошенного агентом `fields` (пакет 5.1.C.tracker) — нужны, чтобы построить
 * `resource_link` (uri/name/title) даже если агент их не запрашивал явно.
 * Дешёвая добавка (два коротких поля), которая делает КАЖДЫЙ элемент
 * коллекции самоидентифицируемым в обоих режимах ответа (`full`/`links`).
 */
const RESOURCE_LINK_IDENTITY_FIELDS = ['key', 'summary'] as const;
/**
 * Инструмент для поиска задач
 *
 * Ответственность (SRP):
 * - Координация процесса поиска задач в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 * - ResponseFieldFilter - фильтрация полей ответа
 */
export class FindIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = FIND_ISSUES_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof FindIssuesParamsSchema {
    return FindIssuesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, FindIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, responseMode, ...searchParams } = validation.data;

    // Гарантируем 'key'/'summary' в наборе полей фильтрации — иначе в режиме
    // links resource_link для элементов, где агент их не запросил, лишился
    // бы адреса/заголовка (см. комментарий RESOURCE_LINK_IDENTITY_FIELDS).
    const fieldsForFilter = Array.from(new Set([...fields, ...RESOURCE_LINK_IDENTITY_FIELDS]));

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Поиск задач',
        searchParams.keys?.length ?? 0,
        fields
      );
      this.logger.debug('Параметры поиска:', {
        hasQuery: !!searchParams.query,
        hasFilter: !!searchParams.filter,
        keysCount: searchParams.keys?.length,
        hasQueue: !!searchParams.queue,
        hasFilterId: !!searchParams.filterId,
        perPage: searchParams.perPage,
      });

      // 3. API v3: поиск задач через findIssues
      // Строим объект с условным добавлением свойств для совместимости с exactOptionalPropertyTypes
      const result = await this.facade.findIssues({
        ...(searchParams.query && { query: searchParams.query }),
        ...(searchParams.filter && { filter: searchParams.filter }),
        ...(searchParams.keys && { keys: searchParams.keys }),
        ...(searchParams.queue && { queue: searchParams.queue }),
        ...(searchParams.filterId && { filterId: searchParams.filterId }),
        ...(searchParams.order && { order: searchParams.order }),
        ...(searchParams.perPage !== undefined && { perPage: searchParams.perPage }),
        ...(searchParams.cursor !== undefined && { cursor: searchParams.cursor }),
        ...(searchParams.expand && { expand: searchParams.expand }),
        ...(searchParams.fetchAll !== undefined && { fetchAll: searchParams.fetchAll }),
        ...(searchParams.maxItems !== undefined && { maxItems: searchParams.maxItems }),
      });

      // 4. Фильтрация полей (всегда включает 'key'/'summary' — см. fieldsForFilter выше)
      const filteredIssues = result.items.map((issue) =>
        ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fieldsForFilter)
      );

      // 5. Логирование результатов
      this.logger.info('Задачи найдены', {
        count: result.items.length,
        fieldsCount: fields.length,
      });

      // 6. Коллекция: полные тела (full) либо resource_link + сводка (links) —
      //    пакет 5.1.B/5.1.C.tracker. Режим — параметр запроса (responseMode),
      //    порог по умолчанию — DEFAULT_COLLECTION_LINKS_THRESHOLD (см. схему).
      return this.formatCollectionResult<IssueWithUnknownFields>({
        items: filteredIssues,
        mode: responseMode,
        toResourceLink: (issue): ResourceLinkDescriptor => ({
          uri: buildIssueResourceUri(issue.key),
          name: issue.key,
          title: issue.summary,
          mimeType: 'application/json',
        }),
        summary: {
          pagination: result.pagination,
          fieldsReturned: fieldsForFilter,
          searchCriteria: {
            hasQuery: !!searchParams.query,
            hasFilter: !!searchParams.filter,
            keysCount: searchParams.keys?.length ?? 0,
            hasQueue: !!searchParams.queue,
          },
        },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при поиске задач', error);
    }
  }
}
