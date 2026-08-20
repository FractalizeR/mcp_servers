/**
 * MCP Tool для получения списка файлов задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: получение файлов из нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 *
 * ВАЖНО: эндпоинт НЕ пагинируется — возвращает все вложения за один ответ,
 * поэтому в выходе нет блока `pagination` и параметров пагинации.
 */

import {
  BaseTool,
  BatchResultProcessor,
  ResponseFieldFilter,
  ResultLogger,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { paginatedFieldFilter } from '#common/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetAttachmentsParamsSchema } from './get-attachments.schema.js';

import { GET_ATTACHMENTS_TOOL_METADATA } from './get-attachments.metadata.js';

/**
 * Инструмент для получения списка файлов задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса получения списка файлов из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class GetAttachmentsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ATTACHMENTS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetAttachmentsParamsSchema {
    return GetAttachmentsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetAttachmentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение файлов задач',
        issueIds.length,
        fields
      );

      // 3. API v2: получение списка файлов для нескольких задач через batch-метод.
      // Эндпоинт НЕ пагинируется — возвращает все вложения за один ответ.
      const results = await this.facade.getAttachmentsMany(issueIds);

      // 4. Обработка результатов через BatchResultProcessor. Отчёт детектора
      // незаполненных полей копится внутри filter по ВСЕМ успешным задачам
      // батча сразу (путь считается "без значения" только если не дал
      // результата ни у одного вложения ни одной задачи; план
      // `plan_tool_contract_unification`, 2.8).
      const filter = paginatedFieldFilter<AttachmentWithUnknownFields>(fields);
      const processedResults = BatchResultProcessor.process(results, filter);
      const { fieldsWithoutValue } = filter.getReport();

      // 6. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Файлы задач получены',
        {
          totalRequested: issueIds.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        {
          total: issueIds.length,
          successful: processedResults.successful.map((item) => ({
            issueId: item.key,
            attachmentsCount: item.data.items.length,
            attachments: item.data.items,
          })),
          failed: processedResults.failed.map((item) => ({
            issueId: item.key,
            error: item.error,
          })),
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении файлов задач (${issueIds.length} задач)`,
        error
      );
    }
  }
}
