/**
 * MCP Tool для создания задачи в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (create issue)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter } from '@mcp-framework/core';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import type { CreateIssueDto } from '@tracker_api/dto/index.js';
import { CreateIssueDefinition } from '@tools/api/issues/create/create-issue.definition.js';
import { CreateIssueParamsSchema } from '@tools/api/issues/create/create-issue.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

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
  static override readonly METADATA = {
    name: buildToolName('create_issue', MCP_TOOL_PREFIX),
    description: 'Создать новую задачу в Яндекс.Трекере',
    category: ToolCategory.ISSUES,
    tags: ['issue', 'create', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new CreateIssueDefinition();

  override getDefinition(): ToolDefinition {
    return this.definition.build();
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
        fieldsCount: fields?.length ?? 'all',
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

      // 5. Фильтрация полей ответа (если указаны)
      const filteredIssue = fields
        ? ResponseFieldFilter.filter<IssueWithUnknownFields>(createdIssue, fields)
        : createdIssue;

      // 6. Логирование результата
      this.logger.info('Задача успешно создана', {
        issueKey: createdIssue.key,
        queue: createdIssue.queue,
        fieldsReturned: fields?.length ?? 'all',
      });

      return this.formatSuccess({
        issueKey: createdIssue.key,
        issue: filteredIssue,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании задачи в очереди ${queue}`, error as Error);
    }
  }
}
