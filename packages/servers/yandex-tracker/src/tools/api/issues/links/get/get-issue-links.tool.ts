/**
 * MCP Tool для получения связей задачи из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get issue links)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetIssueLinksDefinition } from './get-issue-links.definition.js';
import { GetIssueLinksParamsSchema } from './get-issue-links.schema.js';

import { GET_ISSUE_LINKS_TOOL_METADATA } from './get-issue-links.metadata.js';

/**
 * Инструмент для получения связей задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения связей задачи из Яндекс.Трекера
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class GetIssueLinksTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ISSUE_LINKS_TOOL_METADATA;

  private readonly definition = new GetIssueLinksDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueLinksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение связей задачи ${issueId}`);

      // 3. API v3: получение связей задачи
      const links = await this.facade.getIssueLinks(issueId);

      // 4. Логирование результатов
      this.logger.info(`Получено ${links.length} связей для задачи ${issueId}`);

      return this.formatSuccess({
        success: true,
        issueId,
        linksCount: links.length,
        links: links.map((link) => ({
          id: link.id,
          type: {
            id: link.type.id,
            inward: link.type.inward,
            outward: link.type.outward,
          },
          direction: link.direction,
          linkedIssue: {
            id: link.object.id,
            key: link.object.key,
            display: link.object.display,
          },
          createdBy: {
            id: link.createdBy.id,
            display: link.createdBy.display,
          },
          createdAt: link.createdAt,
          ...(link.updatedBy && {
            updatedBy: {
              id: link.updatedBy.id,
              display: link.updatedBy.display,
            },
          }),
          ...(link.updatedAt && { updatedAt: link.updatedAt }),
        })),
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении связей задачи ${issueId}`, error as Error);
    }
  }
}
