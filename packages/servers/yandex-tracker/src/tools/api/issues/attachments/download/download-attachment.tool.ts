/**
 * MCP Tool для скачивания файла из задачи Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (download attachment)
 * - Поддержка base64 и сохранения в файл
 * - Валидация через Zod
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DownloadAttachmentParamsSchema } from './download-attachment.schema.js';
import { writeFile } from 'node:fs/promises';

import { DOWNLOAD_ATTACHMENT_TOOL_METADATA } from './download-attachment.metadata.js';

/**
 * Инструмент для скачивания файла из задачи
 *
 * Ответственность (SRP):
 * - Координация процесса скачивания файла из задачи
 * - Возврат base64 или сохранение в файл
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class DownloadAttachmentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DOWNLOAD_ATTACHMENT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DownloadAttachmentParamsSchema {
    return DownloadAttachmentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DownloadAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, attachmentId, filename, saveToPath } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(
        `Скачивание файла ${filename} (attachmentId=${attachmentId}) из задачи ${issueId}`
      );

      // 3. API v2: скачивание файла
      const result = await this.facade.downloadAttachment(issueId, attachmentId, filename, {
        returnBase64: !saveToPath,
      });

      // 4. Сохранение в файл если указан путь
      if (saveToPath && result.content instanceof Buffer) {
        try {
          await writeFile(saveToPath, result.content);
          this.logger.info(`Файл ${filename} сохранен в ${saveToPath}`);
        } catch (error) {
          return this.formatError(`Не удалось сохранить файл в ${saveToPath}`, error);
        }
      }

      // 5. Логирование результатов
      this.logger.info(
        `Файл ${filename} (${result.metadata.size} байт) успешно скачан из задачи ${issueId}`
      );

      return this.formatSuccess({
        issueId,
        attachmentId,
        filename,
        size: result.metadata.size,
        mimetype: result.metadata.mimetype,
        ...(saveToPath
          ? { savedTo: saveToPath }
          : {
              base64:
                typeof result.content === 'string'
                  ? result.content
                  : result.content.toString('base64'),
            }),
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при скачивании файла ${filename} из задачи ${issueId}`,
        error
      );
    }
  }
}
