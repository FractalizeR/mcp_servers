/**
 * Операция скачивания файла (attachment) из задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО скачивание файла как Buffer
 * - Кеширование метаданных файла (для получения имени/размера)
 * - НЕТ загрузки/удаления файлов
 * - НЕТ сохранения в файловую систему (это делает FileDownloadUtil)
 *
 * API: GET /v3/issues/{issueId}/attachments/{attachmentId}/{filename}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Скачивание файла из задачи
 */
export class DownloadAttachmentOperation extends BaseOperation {
  /**
   * Скачать файл из задачи
   *
   * ВАЖНО: Возвращает только Buffer с содержимым файла.
   * Для сохранения в файл используйте FileDownloadUtil.saveBufferToFile().
   *
   * @param issueId - идентификатор или ключ задачи
   * @param attachmentId - идентификатор файла
   * @param filename - имя файла (требуется API)
   * @returns Buffer с содержимым файла
   *
   * @example
   * ```typescript
   * const buffer = await downloadOp.execute(
   *   'TEST-123',
   *   '67890',
   *   'report.pdf'
   * );
   * console.log(`Скачано ${buffer.length} байт`);
   * ```
   */
  async execute(issueId: string, attachmentId: string, filename: string): Promise<Buffer> {
    this.logger.debug(
      `DownloadAttachmentOperation: скачивание файла ${filename} ` +
        `(attachmentId=${attachmentId}) из ${issueId}`
    );

    // Используем метод downloadFile из BaseOperation
    const buffer = await this.downloadFile(
      `/v3/issues/${issueId}/attachments/${attachmentId}/${encodeURIComponent(filename)}`
    );

    this.logger.info(
      `DownloadAttachmentOperation: файл ${filename} скачан из ${issueId}, ` +
        `размер=${buffer.length} байт`
    );

    return buffer;
  }

  /**
   * Получить метаданные файла без скачивания содержимого
   *
   * Используется для получения информации о файле (имя, размер, MIME тип, etc)
   * перед скачиванием.
   *
   * @param issueId - идентификатор или ключ задачи
   * @param attachmentId - идентификатор файла
   * @returns метаданные файла
   *
   * @example
   * ```typescript
   * const metadata = await downloadOp.getMetadata('TEST-123', '67890');
   * console.log(`Файл: ${metadata.name}, размер: ${metadata.size} байт`);
   * ```
   */
  async getMetadata(issueId: string, attachmentId: string): Promise<AttachmentWithUnknownFields> {
    this.logger.debug(
      `DownloadAttachmentOperation: получение метаданных для attachmentId=${attachmentId}`
    );

    // Получаем список всех файлов и находим нужный
    const attachments = await this.httpClient.get<AttachmentWithUnknownFields[]>(
      `/v3/issues/${issueId}/attachments`
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
}
