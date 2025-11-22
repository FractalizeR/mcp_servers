/**
 * MCP Tool для получения связей задачи из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get issue links)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
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

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetIssueLinksParamsSchema {
    return GetIssueLinksParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueLinksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение связей задачи ${issueId}`);

      // 3. API v3: получение связей задачи
      const links = await this.facade.getIssueLinks(issueId);

      // 4. Фильтрация полей ответа для каждой связи
      const filtered = links.map((link) =>
        ResponseFieldFilter.filter<LinkWithUnknownFields>(link, fields)
      );

      // 5. Логирование результатов
      this.logger.info(`Получено ${filtered.length} связей для задачи ${issueId}`);

      return this.formatSuccess({
        issueId,
        linksCount: filtered.length,
        links: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении связей задачи ${issueId}`, error);
    }
  }
}
