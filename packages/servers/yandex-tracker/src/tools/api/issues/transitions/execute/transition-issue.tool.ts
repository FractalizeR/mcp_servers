/**
 * MCP Tool для выполнения перехода задачи в другой статус
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (transition issue)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';
import { IssueRefetchAfterTransitionError } from '#tracker_api/facade/index.js';
import type { ToolWarning } from '@fractalizer/mcp-core';
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

  /**
   * Фильтрует поля ответа, если `fields` передан — детектор незаполненных
   * полей включён только тогда, иначе предупреждать не о чем (fields
   * опционален у этого инструмента).
   */
  private filterIssueForResponse(
    issue: IssueWithUnknownFields,
    fields: string[] | undefined
  ): { filteredIssue: IssueWithUnknownFields; warnings: ToolWarning[] } {
    if (!fields) {
      return { filteredIssue: issue, warnings: [] };
    }

    const report = ResponseFieldFilter.filterWithReport<IssueWithUnknownFields>(issue, fields);
    return {
      filteredIssue: report.result,
      warnings: ResponseFieldFilter.toWarnings(report.fieldsWithoutValue),
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, transitionId, comment, customFields, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Выполнение перехода задачи ${issueId}`, {
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
      const issue = await this.facade.transitionIssue(issueId, transitionId, transitionData);

      // 5. Фильтрация полей, если указаны
      const { filteredIssue, warnings } = this.filterIssueForResponse(issue, fields);

      // 6. Логирование успешного результата
      this.logger.info(`Переход выполнен для задачи ${issueId}`, {
        transitionId,
        newStatus: issue.status ?? 'unknown',
        fieldsCount: fields?.length ?? 'all',
      });

      return this.formatSuccess(
        {
          issueId,
          transitionId,
          issue: filteredIssue,
        },
        warnings
      );
    } catch (error: unknown) {
      // Находка №1 (BLOCKER, внешнее ревью 2026-08): переход УЖЕ выполнен
      // сервером (POST `_execute` отработал) — провал последующего GET не
      // является провалом перехода. Отдавать `success:false` здесь означало
      // бы спровоцировать агента на повтор не идемпотентного перехода.
      // Возвращаем success с явной пометкой `refetchFailed: true` вместо
      // `issue` — форма зафиксирована в `TransitionIssueOutputDataSchema`.
      if (error instanceof IssueRefetchAfterTransitionError) {
        this.logger.warn(
          `Переход ${transitionId} для задачи ${issueId} выполнен, но дочитывание задачи провалилось — отдаю success с refetchFailed`,
          { error: error.cause }
        );
        return this.formatSuccess({
          issueId,
          transitionId,
          refetchFailed: true,
        });
      }

      return this.formatError(
        `Ошибка при выполнении перехода задачи ${issueId} (transition: ${transitionId})`,
        error
      );
    }
  }
}
