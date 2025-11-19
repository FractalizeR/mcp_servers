/**
 * MCP Tool для обновления задачи в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (update issue)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, ResultLogger } from '@mcp-framework/core';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import type { UpdateIssueDto } from '@tracker_api/dto/index.js';
import { UpdateIssueDefinition } from '@tools/api/issues/update/update-issue.definition.js';
import { UpdateIssueParamsSchema } from '@tools/api/issues/update/update-issue.schema.js';

import { UPDATE_ISSUE_TOOL_METADATA } from './update-issue.metadata.js';

/**
 * Инструмент для обновления задачи
 *
 * Ответственность (SRP):
 * - Координация процесса обновления задачи в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResponseFieldFilter.filter() - фильтрация полей ответа
 * - ResultLogger - стандартизированное логирование
 */
export class UpdateIssueTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = UPDATE_ISSUE_TOOL_METADATA;

  private readonly definition = new UpdateIssueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UpdateIssueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const {
      issueKey,
      summary,
      description,
      assignee,
      priority,
      type,
      status,
      customFields,
      fields,
    } = validation.data;

    try {
      // 2. Подготовка данных для обновления
      const updateData: UpdateIssueDto = {
        ...(summary !== undefined && { summary }),
        ...(description !== undefined && { description }),
        ...(assignee !== undefined && { assignee }),
        ...(priority !== undefined && { priority }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(customFields && customFields),
      };

      // 3. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Обновление задачи ${issueKey}`,
        Object.keys(updateData).length,
        fields
      );

      // 4. API v3: обновление задачи
      const updatedIssue = await this.facade.updateIssue(issueKey, updateData);

      // 5. Фильтрация полей если указаны
      const filteredIssue = fields
        ? ResponseFieldFilter.filter<IssueWithUnknownFields>(updatedIssue, fields)
        : updatedIssue;

      // 6. Логирование результата
      this.logger.info(`Задача ${issueKey} обновлена`, {
        updatedFields: Object.keys(updateData),
        fieldsCount: fields?.length ?? 'all',
      });

      return this.formatSuccess({
        issueKey,
        updatedFields: Object.keys(updateData),
        issue: filteredIssue,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении задачи ${issueKey}`, error as Error);
    }
  }
}
