/**
 * MCP Tool для получения чеклиста задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get checklist)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetChecklistParamsSchema } from '#tools/api/checklists/get/get-checklist.schema.js';

import { GET_CHECKLIST_TOOL_METADATA } from './get-checklist.metadata.js';

/**
 * Инструмент для получения чеклиста задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения чеклиста
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class GetChecklistTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_CHECKLIST_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetChecklistParamsSchema {
    return GetChecklistParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetChecklistParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Получение чеклиста задачи', { issueId, fieldsCount: fields.length });

      // 3. API v2: получение чеклиста
      const checklist: ChecklistItemWithUnknownFields[] = await this.facade.getChecklist(issueId);

      // 4. Фильтрация полей для каждого элемента массива
      const filtered = checklist.map((item) =>
        ResponseFieldFilter.filter<ChecklistItemWithUnknownFields>(item, fields)
      );

      // 5. Логирование результата
      this.logger.info('Чеклист успешно получен', {
        issueId,
        itemsCount: filtered.length,
        fieldsReturned: fields.length,
      });

      return this.formatSuccess({
        checklist: filtered,
        issueId,
        itemsCount: filtered.length,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении чеклиста задачи ${issueId}`, error);
    }
  }
}
