/**
 * MCP Tool для получения комментариев задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get comments)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetCommentsDefinition } from '@tools/api/comments/get/get-comments.definition.js';
import { GetCommentsParamsSchema } from '@tools/api/comments/get/get-comments.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

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
  static override readonly METADATA = {
    name: buildToolName('get_comments', MCP_TOOL_PREFIX),
    description: '[Comments/Read] Получить комментарии задачи',
    category: ToolCategory.COMMENTS,
    subcategory: 'read',
    priority: ToolPriority.HIGH,
    tags: ['comment', 'get', 'list', 'read'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

  private readonly definition = new GetCommentsDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetCommentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, perPage, page, expand } = validation.data;

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
        expand,
      });

      // 4. Логирование результата
      this.logger.info('Комментарии успешно получены', {
        issueId,
        commentsCount: comments.length,
      });

      return this.formatSuccess({
        issueId,
        comments,
        count: comments.length,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении комментариев задачи ${issueId}`,
        error as Error
      );
    }
  }
}
