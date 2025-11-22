/**
 * Issue Attachment Service - сервис для работы с вложениями задач
 *
 * Ответственность:
 * - Получение списка вложений
 * - Загрузка файлов в задачу
 * - Скачивание файлов из задачи (с метаданными)
 * - Получение миниатюр изображений
 * - Удаление вложений
 *
 * Архитектура:
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 * - Композиция логики download (metadata + buffer) и thumbnail
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { GetAttachmentsOperation } from '#tracker_api/api_operations/attachment/get-attachments.operation.js';
import { UploadAttachmentOperation } from '#tracker_api/api_operations/attachment/upload-attachment.operation.js';
import { DownloadAttachmentOperation } from '#tracker_api/api_operations/attachment/download-attachment.operation.js';
import { DeleteAttachmentOperation } from '#tracker_api/api_operations/attachment/delete-attachment.operation.js';
import { GetThumbnailOperation } from '#tracker_api/api_operations/attachment/get-thumbnail.operation.js';
import type {
  UploadAttachmentInput,
  DownloadAttachmentInput,
  DownloadAttachmentOutput,
} from '#tracker_api/dto/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';

@injectable()
export class IssueAttachmentService {
  constructor(
    @inject(GetAttachmentsOperation)
    private readonly getAttachmentsOp: GetAttachmentsOperation,
    @inject(UploadAttachmentOperation)
    private readonly uploadAttachmentOp: UploadAttachmentOperation,
    @inject(DownloadAttachmentOperation)
    private readonly downloadAttachmentOp: DownloadAttachmentOperation,
    @inject(DeleteAttachmentOperation)
    private readonly deleteAttachmentOp: DeleteAttachmentOperation,
    @inject(GetThumbnailOperation)
    private readonly getThumbnailOp: GetThumbnailOperation
  ) {}

  /**
   * Получает список всех прикрепленных файлов к задаче
   * @param issueId - ключ или ID задачи
   * @returns массив прикрепленных файлов
   */
  async getAttachments(issueId: string): Promise<AttachmentWithUnknownFields[]> {
    return this.getAttachmentsOp.execute(issueId);
  }

  /**
   * Загружает файл в задачу
   * @param issueId - ключ или ID задачи
   * @param input - параметры загрузки файла (filename, file, mimetype)
   * @returns информация о загруженном файле
   */
  async uploadAttachment(
    issueId: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentWithUnknownFields> {
    return this.uploadAttachmentOp.execute(issueId, input);
  }

  /**
   * Скачивает прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   * @param filename - имя файла
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое файла и метаданные
   */
  async downloadAttachment(
    issueId: string,
    attachmentId: string,
    filename: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    // Получаем метаданные файла
    const metadata = await this.downloadAttachmentOp.getMetadata(issueId, attachmentId);

    // Скачиваем файл
    const buffer = await this.downloadAttachmentOp.execute(issueId, attachmentId, filename);

    // Формируем результат
    return {
      metadata,
      content: input?.returnBase64 ? buffer.toString('base64') : buffer,
      savedPath: undefined, // Сохранение в файл будет реализовано позже если нужно
    };
  }

  /**
   * Удаляет прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   */
  async deleteAttachment(issueId: string, attachmentId: string): Promise<void> {
    return this.deleteAttachmentOp.execute(issueId, attachmentId);
  }

  /**
   * Получает миниатюру прикрепленного изображения
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла (должно быть изображение)
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое миниатюры и метаданные
   */
  async getThumbnail(
    issueId: string,
    attachmentId: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    // Получаем метаданные файла
    const metadata = await this.getThumbnailOp.getMetadata(issueId, attachmentId);

    // Скачиваем миниатюру
    const buffer = await this.getThumbnailOp.execute(issueId, attachmentId);

    // Формируем результат
    return {
      metadata,
      content: input?.returnBase64 ? buffer.toString('base64') : buffer,
      savedPath: undefined, // Сохранение в файл будет реализовано позже если нужно
    };
  }
}
