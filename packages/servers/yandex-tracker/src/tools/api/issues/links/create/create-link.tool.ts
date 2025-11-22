/**
 * MCP Tool для создания связи между задачами в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (create link)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateLinkParamsSchema } from './create-link.schema.js';

import { CREATE_LINK_TOOL_METADATA } from './create-link.metadata.js';

/**
 * Инструмент для создания связи между задачами
 *
 * Ответственность (SRP):
 * - Координация процесса создания связи в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class CreateLinkTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = CREATE_LINK_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof CreateLinkParamsSchema {
    return CreateLinkParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, CreateLinkParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, relationship, targetIssue, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Создание связи: ${issueId} ${relationship} ${targetIssue}`);

      // 3. API v3: создание связи через facade
      const link = await this.facade.createLink(issueId, {
        relationship,
        issue: targetIssue,
      });

      // 4. Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<LinkWithUnknownFields>(link, fields);

      // 5. Логирование результатов
      this.logger.info(`Связь создана: ${link.id} (${link.type.id})`);

      return this.formatSuccess({
        message: `Связь создана: ${issueId} ${relationship} ${targetIssue}`,
        link: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при создании связи ${issueId} ${relationship} ${targetIssue}`,
        error
      );
    }
  }
}
