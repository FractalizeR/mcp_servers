/**
 * Операция получения миниатюры изображения
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение миниатюры для изображений
 * - Валидация, что файл является изображением
 * - НЕТ загрузки/удаления/скачивания полного файла
 *
 * API: GET /v2/issues/{issueId}/thumbnails/{attachmentId}
 *
 * ВАЖНО: Миниатюры доступны ТОЛЬКО для изображений.
 * Для других типов файлов API вернет ошибку.
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { FileDownloadUtil } from '@tracker_api/utils/index.js';
import type { AttachmentWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Получение миниатюры изображения
 */
export class GetThumbnailOperation extends BaseOperation {
  /**
   * Получить миниатюру изображения
   *
   * ВАЖНО: Работает ТОЛЬКО для изображений (image/*).
   * Для других типов файлов выбросит ошибку.
   *
   * @param issueId - идентификатор или ключ задачи
   * @param attachmentId - идентификатор файла (должен быть изображением)
   * @returns Buffer с изображением миниатюры
   * @throws {Error} если файл не является изображением
   *
   * @example
   * ```typescript
   * const thumbnail = await getThumbnailOp.execute('TEST-123', '67890');
   * console.log(`Миниатюра: ${thumbnail.length} байт`);
   * ```
   */
  async execute(issueId: string, attachmentId: string): Promise<Buffer> {
    this.logger.debug(
      `GetThumbnailOperation: получение миниатюры для attachmentId=${attachmentId}`
    );

    // Используем метод downloadFile из BaseOperation
    const buffer = await this.downloadFile(`/v2/issues/${issueId}/thumbnails/${attachmentId}`);

    this.logger.info(
      `GetThumbnailOperation: миниатюра получена для attachmentId=${attachmentId}, ` +
        `размер=${buffer.length} байт`
    );

    return buffer;
  }

  /**
   * Получить метаданные файла без скачивания содержимого
   *
   * Используется для получения информации о файле (имя, размер, MIME тип, etc)
   * перед скачиванием миниатюры.
   *
   * @param issueId - идентификатор или ключ задачи
   * @param attachmentId - идентификатор файла
   * @returns метаданные файла
   *
   * @example
   * ```typescript
   * const metadata = await getThumbnailOp.getMetadata('TEST-123', '67890');
   * console.log(`Файл: ${metadata.name}, размер: ${metadata.size} байт`);
   * ```
   */
  async getMetadata(issueId: string, attachmentId: string): Promise<AttachmentWithUnknownFields> {
    this.logger.debug(
      `GetThumbnailOperation: получение метаданных для attachmentId=${attachmentId}`
    );

    // Получаем список всех файлов и находим нужный
    const attachments = await this.httpClient.get<AttachmentWithUnknownFields[]>(
      `/v2/issues/${issueId}/attachments`
    );

    const attachment = attachments.find((a) => a.id === attachmentId);

    if (!attachment) {
      throw new Error(
        `Файл с id=${attachmentId} не найден в задаче ${issueId}. ` +
          `Доступные файлы: ${attachments.map((a) => a.id).join(', ')}`
      );
    }

    return attachment;
  }

  /**
   * Проверить, поддерживает ли файл миниатюры
   *
   * Полезно перед вызовом execute() для избежания ошибок API.
   *
   * @param attachment - метаданные файла
   * @returns true если файл поддерживает миниатюры
   *
   * @example
   * ```typescript
   * const metadata = await downloadOp.getMetadata('TEST-123', '67890');
   * if (getThumbnailOp.supportsThumbnail(metadata)) {
   *   const thumbnail = await getThumbnailOp.execute('TEST-123', '67890');
   * }
   * ```
   */
  supportsThumbnail(attachment: AttachmentWithUnknownFields): boolean {
    // Проверяем наличие поля thumbnail в metadata
    if (attachment.thumbnail) {
      return true;
    }

    // Проверяем MIME тип
    if (FileDownloadUtil.isImage(attachment.mimetype)) {
      return true;
    }

    // Проверяем расширение файла (fallback)
    return FileDownloadUtil.isImageByExtension(attachment.name);
  }
}
