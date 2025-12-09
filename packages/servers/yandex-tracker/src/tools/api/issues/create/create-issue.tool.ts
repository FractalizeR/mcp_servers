/**
 * MCP Tool для создания задачи в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (create issue)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { CreateIssueDto } from '#tracker_api/dto/index.js';
import { CreateIssueParamsSchema } from '#tools/api/issues/create/create-issue.schema.js';

import { CREATE_ISSUE_TOOL_METADATA } from './create-issue.metadata.js';

/**
 * Инструмент для создания новой задачи
 *
 * Ответственность (SRP):
 * - Координация процесса создания задачи в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResponseFieldFilter.filter() - фильтрация полей ответа
 */
export class CreateIssueTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = CREATE_ISSUE_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof CreateIssueParamsSchema {
    return CreateIssueParamsSchema;
  }
  /**
   * Построить объект с опциональными полями (только с заполненными значениями)
   * ВАЖНО: Не включаем поля со значением undefined для совместимости с exactOptionalPropertyTypes
   */
  private buildOptionalFields(
    description?: string,
    assignee?: string,
    priority?: string,
    type?: string
  ): Partial<CreateIssueDto> {
    const result: Partial<CreateIssueDto> = {};
    if (description !== undefined) result.description = description;
    if (assignee !== undefined) result.assignee = assignee;
    if (priority !== undefined) result.priority = priority;
    if (type !== undefined) result.type = type;
    return result;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, CreateIssueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queue, summary, description, assignee, priority, type, customFields, fields } =
      validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Создание новой задачи', {
        queue,
        summary,
        hasDescription: Boolean(description),
        hasAssignee: Boolean(assignee),
        hasPriority: Boolean(priority),
        hasType: Boolean(type),
        hasCustomFields: Boolean(customFields),
        fieldsCount: fields.length,
      });

      // 3. Подготовка данных для API
      const issueData: CreateIssueDto = {
        queue,
        summary,
        ...this.buildOptionalFields(description, assignee, priority, type),
        ...customFields,
      };

      // 4. API v3: создание задачи
      const createdIssue = await this.facade.createIssue(issueData);

      // 5. Фильтрация полей ответа
      const filteredIssue = ResponseFieldFilter.filter<IssueWithUnknownFields>(
        createdIssue,
        fields
      );

      // 6. Логирование результата
      this.logger.info('Задача успешно создана', {
        issueKey: createdIssue.key,
        queue: createdIssue.queue,
        fieldsReturned: fields.length,
      });

      return this.formatSuccess({
        issueKey: createdIssue.key,
        issue: filteredIssue,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании задачи в очереди ${queue}`, error);
    }
  }
}
