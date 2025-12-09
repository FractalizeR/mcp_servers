/**
 * MCP Tool для загрузки файла в задачу Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (upload attachment)
 * - Поддержка base64 и file path
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import { UploadAttachmentParamsSchema } from './upload-attachment.schema.js';
import { readFile } from 'node:fs/promises';

import { UPLOAD_ATTACHMENT_TOOL_METADATA } from './upload-attachment.metadata.js';

/**
 * Инструмент для загрузки файла в задачу
 *
 * Ответственность (SRP):
 * - Координация процесса загрузки файла в задачу
 * - Обработка base64 или file path
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class UploadAttachmentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = UPLOAD_ATTACHMENT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UploadAttachmentParamsSchema {
    return UploadAttachmentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UploadAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, filename, fileContent, filePath, mimetype, fields } = validation.data;

    try {
      // 2. Получение содержимого файла
      let fileBuffer: Buffer;

      if (fileContent) {
        // Вариант 1: base64
        this.logger.debug(`Загрузка файла ${filename} из base64 в задачу ${issueId}`);
        fileBuffer = Buffer.from(fileContent, 'base64');
      } else if (filePath) {
        // Вариант 2: file path
        this.logger.debug(`Загрузка файла ${filename} из ${filePath} в задачу ${issueId}`);
        try {
          fileBuffer = await readFile(filePath);
        } catch (error) {
          return this.formatError(`Не удалось прочитать файл ${filePath}`, error);
        }
      } else {
        // Не должно произойти из-за .refine() в схеме
        return this.formatError('Необходимо указать либо fileContent, либо filePath');
      }

      // 3. Логирование начала операции
      this.logger.info(
        `Загрузка файла ${filename} (${fileBuffer.length} байт) в задачу ${issueId}`
      );

      // 4. API v2: загрузка файла
      const attachment = await this.facade.uploadAttachment(issueId, {
        filename,
        file: fileBuffer,
        mimetype,
      });

      // 5. Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<AttachmentWithUnknownFields>(attachment, fields);

      // 6. Логирование результатов
      this.logger.info(
        `Файл ${filename} успешно загружен в задачу ${issueId}, attachmentId=${attachment.id}`
      );

      return this.formatSuccess({
        issueId,
        attachment: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при загрузке файла ${filename} в задачу ${issueId}`, error);
    }
  }
}
