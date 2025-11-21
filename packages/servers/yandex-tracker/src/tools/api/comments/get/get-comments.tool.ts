/**
 * MCP Tool для получения комментариев задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get comments)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetCommentsParamsSchema } from '#tools/api/comments/get/get-comments.schema.js';

import { GET_COMMENTS_TOOL_METADATA } from './get-comments.metadata.js';

/**
 * Инструмент для получения комментариев задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения комментариев
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class GetCommentsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_COMMENTS_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetCommentsParamsSchema {
    return GetCommentsParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetCommentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, perPage, page, expand, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Получение комментариев задачи', {
        issueId,
        perPage,
        page,
        expand,
      });

      // 3. API v3: получение комментариев
      const comments = await this.facade.getComments(issueId, {
        perPage,
        page,
        expand: expand?.join(','),
      });

      // 4. Фильтрация полей ответа для каждого комментария
      const filtered = comments.map((comment) =>
        ResponseFieldFilter.filter<CommentWithUnknownFields>(comment, fields)
      );

      // 5. Логирование результата
      this.logger.info('Комментарии успешно получены', {
        issueId,
        commentsCount: filtered.length,
      });

      return this.formatSuccess({
        issueId,
        comments: filtered,
        count: filtered.length,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении комментариев задачи ${issueId}`,
        error as Error
      );
    }
  }
}
