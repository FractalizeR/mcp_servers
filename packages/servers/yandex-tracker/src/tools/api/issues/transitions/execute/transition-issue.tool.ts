/**
 * MCP Tool для выполнения перехода задачи в другой статус
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (transition issue)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter } from '@mcp-framework/core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';
import { TransitionIssueParamsSchema } from '#tools/api/issues/transitions/execute/transition-issue.schema.js';

import { TRANSITION_ISSUE_TOOL_METADATA } from './transition-issue.metadata.js';

/**
 * Инструмент для выполнения перехода задачи в другой статус
 *
 * Ответственность (SRP):
 * - Координация процесса выполнения перехода задачи
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 * - Фильтрация полей ответа через ResponseFieldFilter
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResponseFieldFilter.filter() - фильтрация полей ответа
 * - ResultLogger - стандартизированное логирование
 */
export class TransitionIssueTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = TRANSITION_ISSUE_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof TransitionIssueParamsSchema {
    return TransitionIssueParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKey, transitionId, comment, customFields, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Выполнение перехода задачи ${issueKey}`, {
        transitionId,
        hasComment: !!comment,
        hasCustomFields: !!customFields,
        fields: fields?.length ?? 'all',
      });

      // 3. Подготовка данных для перехода
      const transitionData: ExecuteTransitionDto | undefined =
        comment !== undefined || customFields
          ? {
              ...(comment !== undefined && { comment }),
              ...customFields,
            }
          : undefined;

      // 4. API v3: выполнение перехода
      const issue = await this.facade.transitionIssue(issueKey, transitionId, transitionData);

      // 5. Фильтрация полей если указаны
      const filteredIssue = fields
        ? ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fields)
        : issue;

      // 6. Логирование успешного результата
      this.logger.info(`Переход выполнен для задачи ${issueKey}`, {
        transitionId,
        newStatus: issue.status ?? 'unknown',
        fieldsCount: fields?.length ?? 'all',
      });

      return this.formatSuccess({
        issueKey,
        transitionId,
        issue: filteredIssue,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при выполнении перехода задачи ${issueKey} (transition: ${transitionId})`,
        error as Error
      );
    }
  }
}
