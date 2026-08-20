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
import {
  ResponseFieldFilter,
  ResultLogger,
  resolveCollectionResponseMode,
} from '@fractalizer/mcp-core';
import type {
  CollectionResponseMode,
  ResourceLinkDescriptor,
  ToolWarning,
} from '@fractalizer/mcp-core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import { FindIssuesParamsSchema } from '#tools/api/issues/find/find-issues.schema.js';
import type { FindIssuesParams } from '#tools/api/issues/find/find-issues.schema.js';
import { buildIssueResourceUri } from '#resources/tracker-resource-uri.js';

import { FIND_ISSUES_TOOL_METADATA } from './find-issues.metadata.js';

/**
 * Поля, которые нужны, чтобы построить `resource_link` (uri/name/title) в
 * режиме `links` — добавляются ТОЛЬКО там. В режиме `full` тела отдаются
 * ровно по запрошенному `fields` (никакого «подмешивания» summary — оно
 * дорого по контексту в самом массовом инструменте).
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

  /**
   * Вписывает предупреждения в уже построенный `ToolResult` — тот же приём,
   * что `BaseTool.formatSuccess()` (framework, не в наборе этого пакета):
   * JSON.stringify текстового дубля + поле `warnings` в `structuredContent`.
   * Нужен здесь отдельно, потому что `formatCollectionResult()` не принимает
   * `warnings` параметром (см. границы плана `plan_tool_contract_unification`,
   * 2.0 — framework трогать нельзя).
   */
  private injectWarnings(result: ToolResult, warnings: ToolWarning[]): ToolResult {
    if (warnings.length === 0 || result.content[0]?.type !== 'text') {
      return result;
    }

    const structuredContent = {
      ...(result['structuredContent'] as Record<string, unknown>),
      warnings,
    };
    const [firstBlock, ...restBlocks] = result.content;

    return {
      ...result,
      content: [{ ...firstBlock, text: JSON.stringify(structuredContent, null, 2) }, ...restBlocks],
      structuredContent,
    };
  }

  /**
   * Строит параметры вызова фасада (не трогаем контракт, см. границы плана
   * `plan_tool_contract_unification`) — фасад ждёт поле `keys`, а схема
   * инструмента — `issueIds`. Условное добавление свойств — совместимость с
   * `exactOptionalPropertyTypes`.
   */
  private buildFacadeParams(
    searchParams: Omit<FindIssuesParams, 'fields' | 'responseMode'>
  ): Parameters<YandexTrackerFacade['findIssues']>[0] {
    return {
      ...(searchParams.query && { query: searchParams.query }),
      ...(searchParams.filter && { filter: searchParams.filter }),
      ...(searchParams.issueIds && { keys: searchParams.issueIds }),
      ...(searchParams.queue && { queue: searchParams.queue }),
      ...(searchParams.filterId && { filterId: searchParams.filterId }),
      ...(searchParams.order && { order: searchParams.order }),
      ...(searchParams.perPage !== undefined && { perPage: searchParams.perPage }),
      ...(searchParams.cursor !== undefined && { cursor: searchParams.cursor }),
      ...(searchParams.expand && { expand: searchParams.expand }),
      ...(searchParams.fetchAll !== undefined && { fetchAll: searchParams.fetchAll }),
      ...(searchParams.maxItems !== undefined && { maxItems: searchParams.maxItems }),
    };
  }

  /**
   * Режим ответа и фильтрация полей: `key`/`summary` добавляются ТОЛЬКО в
   * режиме `links` (нужны для resource_link uri/title). В `full` — ровно
   * `fields`, и только там же считается отчёт детектора незаполненных полей
   * (ГРАНИЧНЫЙ СЛУЧАЙ плана: в `links` тела задач заменены на resource_link
   * целиком — НИ ОДНО запрошенное поле не присутствует в ответе, поэтому
   * включённый там детектор дал бы предупреждение на весь список fields даже
   * у полностью корректного вызова; детектор должен быть выключен в этом
   * режиме).
   */
  private filterIssuesForResponse(
    items: IssueWithUnknownFields[],
    fields: string[],
    resolvedMode: 'links' | 'full'
  ): { filteredIssues: IssueWithUnknownFields[]; fieldsWithoutValue: string[] } {
    if (resolvedMode === 'links') {
      const identityFieldsForFilter = Array.from(
        new Set([...fields, ...RESOURCE_LINK_IDENTITY_FIELDS])
      );
      const filteredIssues = items.map((issue) =>
        ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, identityFieldsForFilter)
      );
      return { filteredIssues, fieldsWithoutValue: [] };
    }

    const report = ResponseFieldFilter.filterWithReport<IssueWithUnknownFields[]>(items, fields);
    return { filteredIssues: report.result, fieldsWithoutValue: report.fieldsWithoutValue };
  }

  /**
   * Дефект №3 (тихая потеря данных): при поиске по `issueIds` Трекер молча
   * опускает ненайденные элементы в ответе — единственным намёком раньше было
   * расхождение issueIdsCount/itemsOnPage. Сравнение регистрозависимое (см.
   * find-issues.schema.ts): Трекер не считает "test-15" == "TEST-15".
   *
   * Находка №2 (MAJOR, внешнее ревью 2026-08): `result.items` — это ОДНА
   * страница (или обрезанная цепочка при `truncated`), а не гарантированно
   * полная выдача. Раньше `notFoundIssueIds` считался по ней всегда — если
   * запрошенных элементов больше, чем влезает на страницу, все со второй и
   * далее страниц ошибочно попадали в notFoundIssueIds, и агент читал «задачи
   * не существует» там, где она просто не поместилась на странице (риск дубля
   * выше исходного дефекта тихой потери). `notFoundIssueIds` теперь считается
   * ТОЛЬКО когда выдача заведомо полная (`pagination.fetchedAll === true` —
   * полный обход завершён без обрыва по лимиту и без незагруженной следующей
   * страницы); иначе поле не отдаётся вовсе — семантика «не могу утверждать»,
   * а не ложное «не найдено».
   */
  private computeNotFoundIssueIds(
    requestedIssueIds: string[] | undefined,
    result: PaginatedResult<IssueWithUnknownFields>
  ): string[] | undefined {
    if (!requestedIssueIds || !result.pagination.fetchedAll) {
      return undefined;
    }
    return requestedIssueIds.filter(
      (requestedId) => !result.items.some((issue) => issue.key === requestedId)
    );
  }

  /**
   * Коллекция: полные тела (full) либо resource_link + сводка (links) —
   * пакет 5.1.B/5.1.C.tracker. Режим — параметр запроса (responseMode), порог
   * по умолчанию — DEFAULT_COLLECTION_LINKS_THRESHOLD (см. схему).
   *
   * БЕЗ явного type argument: `formatCollectionResult<TItem, TSummary =
   * undefined>` — при частичном списке явных type argument'ов
   * (`<IssueWithUnknownFields>`, без второго) TS контекстно типизирует
   * `summary` ПО ДЕФОЛТУ (`undefined`) до вывода типа из аргументов, а не
   * выводит TSummary из фактически переданного объекта — сборка падала на
   * TS2322 ровно на этом (summary был объектом, контекстный тип —
   * `undefined`). Без explicit type argument TS выводит и TItem, и TSummary
   * из формы аргументов (`items`/`toResourceLink`/`summary`) целиком, без
   * участия дефолта — типобезопасно и без `as`.
   */
  private buildCollectionResult(
    filteredIssues: IssueWithUnknownFields[],
    responseMode: CollectionResponseMode,
    result: PaginatedResult<IssueWithUnknownFields>,
    searchParams: Omit<FindIssuesParams, 'fields' | 'responseMode'>,
    notFoundIssueIds: string[] | undefined
  ): ToolResult {
    return this.formatCollectionResult({
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
        searchCriteria: {
          hasQuery: !!searchParams.query,
          hasFilter: !!searchParams.filter,
          issueIdsCount: searchParams.issueIds?.length ?? 0,
          hasQueue: !!searchParams.queue,
          ...(notFoundIssueIds !== undefined ? { notFoundIssueIds } : {}),
        },
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, FindIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, responseMode, ...searchParams } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Поиск задач',
        searchParams.issueIds?.length ?? 0,
        fields
      );
      this.logger.debug('Параметры поиска:', {
        hasQuery: !!searchParams.query,
        hasFilter: !!searchParams.filter,
        issueIdsCount: searchParams.issueIds?.length,
        hasQueue: !!searchParams.queue,
        hasFilterId: !!searchParams.filterId,
        perPage: searchParams.perPage,
      });

      // 3. API v3: поиск задач через findIssues
      const result = await this.facade.findIssues(this.buildFacadeParams(searchParams));

      // 4. Режим ответа, фильтрация полей и ненайденные элементы (см. приватные методы)
      const resolvedMode = resolveCollectionResponseMode(responseMode, result.items.length);
      const { filteredIssues, fieldsWithoutValue } = this.filterIssuesForResponse(
        result.items,
        fields,
        resolvedMode
      );
      const notFoundIssueIds = this.computeNotFoundIssueIds(searchParams.issueIds, result);

      // 5. Логирование результатов
      this.logger.info('Задачи найдены', {
        count: result.items.length,
        fieldsCount: fields.length,
      });

      // 6. Коллекция: полные тела (full) либо resource_link + сводка (links)
      const collectionResult = this.buildCollectionResult(
        filteredIssues,
        responseMode,
        result,
        searchParams,
        notFoundIssueIds
      );

      return this.injectWarnings(
        collectionResult,
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при поиске задач', error);
    }
  }
}
