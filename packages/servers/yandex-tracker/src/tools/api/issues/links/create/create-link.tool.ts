/**
 * MCP Tool для создания связей между задачами в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: создание связей для нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import {
  BaseTool,
  ResponseFieldFilter,
  BatchResultProcessor,
  ResultLogger,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateLinkParamsSchema } from './create-link.schema.js';

import { CREATE_LINK_TOOL_METADATA } from './create-link.metadata.js';

/**
 * Инструмент для создания связей между задачами (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса создания связей для нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class CreateLinkTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = CREATE_LINK_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof CreateLinkParamsSchema {
    return CreateLinkParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, CreateLinkParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { links, fields } = validation.data;

    // 'id' нужен всегда: из него строится `linkId` (строковый ключ для
    // последующего delete_link). API возвращает id числом, а схема ждёт строку.
    const fieldsForFilter = Array.from(new Set([...fields, 'id']));

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Создание связей', links.length, fields);

      // 3. API v3: создание связей через batch-метод. Фасад (не трогаем контракт,
      // см. границы плана `plan_tool_contract_unification`) ждёт поле `targetIssue`.
      const results = await this.facade.createLinksMany(
        links.map((link) => ({
          issueId: link.issueId,
          relationship: link.relationship,
          targetIssue: link.targetIssueId,
        }))
      );

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (link: LinkWithUnknownFields): Partial<LinkWithUnknownFields> =>
          ResponseFieldFilter.filter<LinkWithUnknownFields>(link, fieldsForFilter)
      );

      // 5. Отчёт детектора незаполненных полей — по СЫРЫМ созданным связям,
      // ровно по запрошенным `fields` (без служебного `id`, добавленного
      // в fieldsForFilter только для построения linkId).
      const rawLinks: LinkWithUnknownFields[] = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(rawLinks, fields);

      // 6. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Связи созданы',
        {
          totalRequested: links.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        {
          total: links.length,
          successful: processedResults.successful.map((item) => ({
            issueId: item.key,
            linkId: String(item.data.id),
            link: item.data,
          })),
          failed: processedResults.failed.map((item) => ({
            issueId: item.key,
            error: item.error,
          })),
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании связей (${links.length} задач)`, error);
    }
  }
}
