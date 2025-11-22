/**
 * MCP Tool для получения списка файлов задачи из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get attachments)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetAttachmentsParamsSchema } from './get-attachments.schema.js';

import { GET_ATTACHMENTS_TOOL_METADATA } from './get-attachments.metadata.js';

/**
 * Инструмент для получения списка файлов задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения списка файлов задачи из Яндекс.Трекера
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
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

    const { issueId, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение списка файлов задачи ${issueId}`);

      // 3. API v2: получение списка файлов задачи
      const attachments = await this.facade.getAttachments(issueId);

      // 4. Фильтрация полей ответа для каждого attachment
      const filtered = attachments.map((attachment) =>
        ResponseFieldFilter.filter<AttachmentWithUnknownFields>(attachment, fields)
      );

      // 5. Логирование результатов
      this.logger.info(`Получено ${filtered.length} файлов для задачи ${issueId}`);

      return this.formatSuccess({
        issueId,
        attachmentsCount: filtered.length,
        attachments: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении списка файлов задачи ${issueId}`, error);
    }
  }
}
