/**
 * MCP Tool для удаления связи между задачами в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete link)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteLinkDefinition } from './delete-link.definition.js';
import { DeleteLinkParamsSchema } from './delete-link.schema.js';

import { DELETE_LINK_TOOL_METADATA } from './delete-link.metadata.js';

/**
 * Инструмент для удаления связи между задачами
 *
 * Ответственность (SRP):
 * - Координация процесса удаления связи в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class DeleteLinkTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_LINK_TOOL_METADATA;

  private readonly definition = new DeleteLinkDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteLinkParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, linkId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Удаление связи ${linkId} из задачи ${issueId}`);

      // 3. API v3: удаление связи через facade
      await this.facade.deleteLink(issueId, linkId);

      // 4. Логирование результатов
      this.logger.info(`Связь ${linkId} удалена из задачи ${issueId}`);

      return this.formatSuccess({
        success: true,
        message: `Связь ${linkId} удалена из задачи ${issueId}`,
        issueId,
        linkId,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении связи ${linkId} из задачи ${issueId}`,
        error as Error
      );
    }
  }
}
