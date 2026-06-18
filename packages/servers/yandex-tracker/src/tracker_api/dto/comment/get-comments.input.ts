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
  expand?: string | undefined;

  /**
   * Opt-in полного обхода всех страниц по `Link rel="next"`.
   *
   * По умолчанию (`false`/не задан) возвращается одна страница + метаданные.
   * При `true` обход стартует с первой страницы (несовместимо с явным `page`).
   */
  fetchAll?: boolean | undefined;

  /**
   * Максимум комментариев на одну цепочку пагинации при `fetchAll=true`.
   *
   * Дефолт применяет паджинатор (`DEFAULT_MAX_ITEMS`). При срабатывании —
   * `pagination.truncated=true`.
   */
  maxItems?: number | undefined;
}
