/**
 * Операция удаления файла (attachment) из задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление файла по ID
 * - Инвалидация кеша списка файлов после удаления
 * - НЕТ загрузки/скачивания файлов
 *
 * API: DELETE /v2/issues/{issueId}/attachments/{attachmentId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

/**
 * Удаление файла из задачи
 */
export class DeleteAttachmentOperation extends BaseOperation {
  /**
   * Удалить файл из задачи
   *
   * ВАЖНО: Операция необратима. После удаления файл нельзя восстановить.
   *
   * @param issueId - идентификатор или ключ задачи
   * @param attachmentId - идентификатор файла
   * @returns void (успешное удаление)
   *
   * @example
   * ```typescript
   * await deleteOp.execute('TEST-123', '67890');
   * console.log('Файл удален');
   * ```
   */
  async execute(issueId: string, attachmentId: string): Promise<void> {
    this.logger.debug(
      `DeleteAttachmentOperation: удаление файла attachmentId=${attachmentId} из ${issueId}`
    );

    // Удаляем файл
    await this.deleteRequest<void>(`/v2/issues/${issueId}/attachments/${attachmentId}`);

    // Инвалидация кеша списка файлов
    const listCacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, `list:${issueId}`);
    await this.cacheManager.delete(listCacheKey);

    this.logger.info(
      `DeleteAttachmentOperation: файл attachmentId=${attachmentId} удален из ${issueId}`
    );
  }
}
