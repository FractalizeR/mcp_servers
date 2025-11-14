/**
 * MCP Tool для получения задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (batch get issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp/tools/base/index.js';
import type { ToolDefinition } from '@mcp/tools/base/index.js';
import type { ToolCallParams, ToolResult } from '@types';
import { ResponseFieldFilter } from '@mcp/utils/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetIssuesDefinition } from '@mcp/tools/api/issues/get/get-issues.definition.js';
import { GetIssuesParamsSchema } from '@mcp/tools/api/issues/get/get-issues.schema.js';

/**
 * Инструмент для получения информации о задачах
 *
 * Ответственность (SRP):
 * - Получение задач по массиву ключей из Яндекс.Трекера (batch-режим)
 * - Валидация параметров через Zod
 * - Фильтрация полей ответа для минимизации контекста
 * - Форматирование результата
 */
export class GetIssuesTool extends BaseTool {
  private readonly definition = new GetIssuesDefinition();

  getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через Zod
    const validationResult = GetIssuesParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return this.formatError(
        'Ошибка валидации параметров',
        new Error(validationResult.error.errors.map((e) => e.message).join('; '))
      );
    }

    const { issueKeys, fields } = validationResult.data;

    try {
      this.logger.info(`Получение задач: ${issueKeys.length}`, {
        issueKeys,
        fields: fields ? fields.length : 'all',
      });

      // 2. API v3: получение задач через batch-метод
      const results = await this.trackerFacade.getIssues(issueKeys);

      // 3. Обработка результатов (успешные и ошибки)
      const processedResults = this.processResults(results, fields);

      this.logResults(issueKeys, processedResults, fields);

      return this.formatSuccess({
        total: issueKeys.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        issues: processedResults.successful,
        errors: processedResults.failed,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении задач (${issueKeys.length} шт.)`,
        error as Error
      );
    }
  }

  /**
   * Обработка результатов batch-операции
   * @param results - результаты получения задач
   * @param fields - поля для фильтрации
   * @returns обработанные результаты (успешные и ошибки)
   */
  private processResults(
    results: Awaited<ReturnType<typeof this.trackerFacade.getIssues>>,
    fields?: string[]
  ): {
    successful: Array<{ issueKey: string; issue: Partial<IssueWithUnknownFields> }>;
    failed: Array<{ issueKey: string; error: string }>;
  } {
    const successful: Array<{ issueKey: string; issue: Partial<IssueWithUnknownFields> }> = [];
    const failed: Array<{ issueKey: string; error: string }> = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        // Type Guard: когда status === 'fulfilled', value всегда определено
        if (!result.value) {
          failed.push({
            issueKey: result.issueKey,
            error: 'Задача не найдена (пустой результат)',
          });
          continue;
        }

        const issue: IssueWithUnknownFields = result.value;

        // Фильтрация полей если указаны
        const filteredIssue: Partial<IssueWithUnknownFields> = fields
          ? (ResponseFieldFilter.filter<IssueWithUnknownFields>(
              issue,
              fields
            ) as Partial<IssueWithUnknownFields>)
          : issue;

        successful.push({
          issueKey: result.issueKey,
          issue: filteredIssue,
        });
      } else {
        const error =
          result.reason instanceof Error ? result.reason.message : String(result.reason);

        failed.push({
          issueKey: result.issueKey,
          error,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Логирование результатов
   */
  private logResults(
    issueKeys: string[],
    processedResults: {
      successful: Array<{ issueKey: string; issue: Partial<IssueWithUnknownFields> }>;
      failed: Array<{ issueKey: string; error: string }>;
    },
    fields?: string[]
  ): void {
    this.logger.debug(`Задачи получены (${issueKeys.length} шт.)`, {
      successful: processedResults.successful.length,
      failed: processedResults.failed.length,
      fieldsCount: fields?.length ?? 'all',
    });

    // Логируем детальную статистику по размерам (только в debug режиме)
    if (processedResults.successful.length > 0) {
      const totalOriginalSize = processedResults.successful.reduce(
        (sum, item) => sum + JSON.stringify(item.issue).length,
        0
      );
      this.logger.debug('Статистика размеров ответа', {
        totalFilteredSize: totalOriginalSize,
        averageSize: Math.round(totalOriginalSize / processedResults.successful.length),
      });
    }
  }
}
