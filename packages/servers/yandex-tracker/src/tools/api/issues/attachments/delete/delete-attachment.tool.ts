/**
 * MCP Tool для удаления файла из задачи Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete attachment)
 * - Валидация через Zod
 * - Операция необратима
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteAttachmentParamsSchema } from './delete-attachment.schema.js';
import { DELETE_ATTACHMENT_TOOL_METADATA } from './delete-attachment.metadata.js';

/**
 * Инструмент для удаления файла из задачи
 *
 * Ответственность (SRP):
 * - Координация процесса удаления файла из задачи
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class DeleteAttachmentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_ATTACHMENT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteAttachmentParamsSchema {
    return DeleteAttachmentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, attachmentId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Удаление файла attachmentId=${attachmentId} из задачи ${issueId}`);

      // 3. API v2: удаление файла
      await this.facade.deleteAttachment(issueId, attachmentId);

      // 4. Логирование результатов
      this.logger.info(`Файл attachmentId=${attachmentId} успешно удален из задачи ${issueId}`);

      return this.formatSuccess({
        issueId,
        attachmentId,
        deleted: true,
        message: 'Файл успешно удален',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении файла attachmentId=${attachmentId} из задачи ${issueId}`,
        error as Error
      );
    }
  }
}
