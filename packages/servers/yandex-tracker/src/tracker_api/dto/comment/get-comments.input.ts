/**
 * DTO для получения списка комментариев
 *
 * Используется в GetCommentsOperation и yandex_tracker_get_comments tool.
 */
import type { PaginationParams } from '../../entities/common/pagination.entity.js';

export interface GetCommentsInput extends PaginationParams {
  /**
   * Параметр expand для включения дополнительных данных
   * @example "attachments" - включить информацию о вложениях
   */
  expand?: string;
}
