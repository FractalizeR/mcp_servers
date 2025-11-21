/**
 * MCP Tool для получения доступных переходов статусов задачи
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get issue transitions)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, ResultLogger } from '@mcp-framework/core';
import type { TransitionWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueTransitionsParamsSchema } from '#tools/api/issues/transitions/get/get-issue-transitions.schema.js';

import { GET_ISSUE_TRANSITIONS_TOOL_METADATA } from './get-issue-transitions.metadata.js';

/**
 * Инструмент для получения доступных переходов статусов задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения доступных переходов из Яндекс.Трекера
 * - Делегирование валидации в BaseTool
 * - Делегирование фильтрации полей в ResponseFieldFilter
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResponseFieldFilter.filter() - фильтрация полей ответа
 * - ResultLogger - стандартизированное логирование
 */
export class GetIssueTransitionsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ISSUE_TRANSITIONS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetIssueTransitionsParamsSchema {
    return GetIssueTransitionsParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueTransitionsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKey, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Получение доступных переходов для ${issueKey}`,
        1,
        fields
      );

      // 3. API v3: получение доступных переходов
      const transitions = await this.facade.getIssueTransitions(issueKey);

      // 4. Фильтрация полей ответа
      const filteredTransitions = transitions.map((transition: TransitionWithUnknownFields) =>
        ResponseFieldFilter.filter<TransitionWithUnknownFields>(transition, fields)
      );

      // 5. Логирование результатов
      this.logger.info(`Переходы получены для ${issueKey}`, {
        issueKey,
        transitionsCount: filteredTransitions.length,
        fieldsCount: fields.length,
      });

      return this.formatSuccess({
        issueKey,
        transitionsCount: filteredTransitions.length,
        transitions: filteredTransitions,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении переходов для задачи ${issueKey}`,
        error as Error
      );
    }
  }
}
