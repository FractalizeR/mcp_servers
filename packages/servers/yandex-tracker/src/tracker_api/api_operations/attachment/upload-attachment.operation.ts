/**
 * Операция загрузки файла (attachment) в задачу
 *
 * Ответственность (SRP):
 * - ТОЛЬКО загрузка одного файла через multipart/form-data
 * - Валидация размера и имени файла
 * - Подготовка FormData через FileUploadUtil
 * - Инвалидация кеша списка файлов после загрузки
 * - НЕТ скачивания/удаления файлов
 *
 * API: POST /v2/issues/{issueId}/attachments
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { FileUploadUtil } from '#tracker_api/utils/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UploadAttachmentInput } from '#tracker_api/dto/index.js';

/**
 * Максимальный размер файла для загрузки (в байтах)
 * По умолчанию: 10 MB
 *
 * ВАЖНО: Можно переопределить через конфигурацию сервера
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Загрузка файла в задачу
 */
export class UploadAttachmentOperation extends BaseOperation {
  private readonly maxFileSize: number;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    config?: { maxFileSize?: number }
  ) {
    super(httpClient, cacheManager, logger);
    this.maxFileSize = config?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  }

  /**
   * Загрузить файл в задачу
   *
   * @param issueId - идентификатор или ключ задачи
   * @param input - параметры загрузки файла
   * @returns информация о загруженном файле
   * @throws {Error} если файл слишком большой
   * @throws {Error} если имя файла невалидно
   *
   * @example
   * ```typescript
   * const attachment = await uploadOp.execute('TEST-123', {
   *   filename: 'report.pdf',
   *   file: Buffer.from('...'),
   *   mimetype: 'application/pdf'
   * });
   * ```
   */
  async execute(
    issueId: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentWithUnknownFields> {
    const { filename, file, mimetype } = input;

    // Валидация имени файла
    if (!FileUploadUtil.validateFilename(filename)) {
      throw new Error(
        `Невалидное имя файла: ${filename}. ` +
          `Имя не должно содержать спецсимволы и пути (../, /, \\)`
      );
    }

    // Конвертация base64 в Buffer если нужно
    const buffer = typeof file === 'string' ? Buffer.from(file, 'base64') : file;

    // Валидация размера файла
    if (!FileUploadUtil.validateFileSize(buffer.length, this.maxFileSize)) {
      throw new Error(
        `Файл слишком большой: ${FileUploadUtil.formatFileSize(buffer.length)}. ` +
          `Максимальный размер: ${FileUploadUtil.formatFileSize(this.maxFileSize)}`
      );
    }

    this.logger.debug(
      `UploadAttachmentOperation: загрузка файла ${filename} ` +
        `(${FileUploadUtil.formatFileSize(buffer.length)}) в ${issueId}`
    );

    // Определяем MIME тип если не указан
    const effectiveMimetype = mimetype || FileUploadUtil.getMimeType(filename);

    // Подготовка FormData
    const formData = FileUploadUtil.prepareMultipartFormData(buffer, filename);

    // Загрузка файла
    const attachment = await this.uploadFile<AttachmentWithUnknownFields>(
      `/v2/issues/${issueId}/attachments`,
      formData
    );

    // Инвалидация кеша списка файлов
    const listCacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, `list:${issueId}`);
    await this.cacheManager.delete(listCacheKey);

    this.logger.info(
      `UploadAttachmentOperation: файл ${filename} загружен в ${issueId}, ` +
        `attachmentId=${attachment.id}, mimetype=${effectiveMimetype}`
    );

    return attachment;
  }
}
