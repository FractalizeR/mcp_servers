import { BaseTool } from '@mcp/tools/base-tool.js';
import type { ToolDefinition } from '@mcp/tools/base-tool.js';
import type { ToolCallParams, ToolResult } from '@types';
import { ResponseFieldFilter } from '@domain/utils/index.js';
import type { Issue } from '@domain/entities/issue.entity.js';

/**
 * Инструмент для получения информации о задачах
 *
 * Ответственность (SRP):
 * - Получение задач по массиву ключей из Яндекс.Трекера (batch-режим)
 * - Валидация ключей задач
 * - Фильтрация полей ответа для минимизации контекста
 * - Форматирование результата
 */
export class GetIssuesTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'yandex_tracker_get_issues',
      description:
        'Получение информации о задачах по массиву ключей в Яндекс.Трекере. ' +
        'Поддерживает batch-режим для параллельного получения нескольких задач. ' +
        'Поддерживает фильтрацию полей для оптимизации размера ответа.',
      inputSchema: {
        type: 'object',
        properties: {
          issueKeys: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Массив ключей задач в формате QUEUE-123 (например: ["PROJ-456", "PROJ-789"]). ' +
              'Для получения одной задачи передайте массив из одного элемента.',
          },
          fields: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Необязательный массив полей для возврата. ' +
              'Поддерживается dot-notation для вложенных полей (например: "assignee.login"). ' +
              'Если не указан, возвращаются все поля. ' +
              'Примеры полей: "key", "summary", "status", "assignee.login", "createdAt"',
          },
        },
        required: ['issueKeys'],
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация и подготовка параметров
    const prepareResult = this.prepareParams(params);
    if (prepareResult.error) {
      return this.formatError(prepareResult.error);
    }

    const { issueKeys, fields } = prepareResult;

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
   * Подготовка и валидация параметров
   * @param params - параметры запроса
   * @returns объект с подготовленными параметрами или ошибкой
   */
  private prepareParams(params: ToolCallParams): {
    issueKeys: string[];
    fields?: string[];
    error?: string;
  } {
    const validationError = this.validateParams(params);
    if (validationError) {
      return { issueKeys: [], error: validationError };
    }

    const issueKeys = params['issueKeys'] as string[];

    try {
      const fields = this.extractFields(params);
      return { issueKeys, fields };
    } catch (error: unknown) {
      return { issueKeys: [], error: (error as Error).message };
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
    successful: Array<{ issueKey: string; issue: Partial<Issue> }>;
    failed: Array<{ issueKey: string; error: string }>;
  } {
    const successful: Array<{ issueKey: string; issue: Partial<Issue> }> = [];
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

        const issue: Issue = result.value;
        const filteredIssue: Partial<Issue> = fields
          ? (ResponseFieldFilter.filter<Issue>(issue, fields) as Partial<Issue>)
          : issue;

        successful.push({
          issueKey: result.issueKey,
          issue: filteredIssue,
        });
      } else {
        const error =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

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
      successful: Array<{ issueKey: string; issue: Partial<Issue> }>;
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

  /**
   * Валидация параметров запроса
   * @param params - параметры запроса
   * @returns сообщение об ошибке или null
   */
  private validateParams(params: ToolCallParams): string | null {
    // Проверка наличия параметра
    if (params['issueKeys'] === undefined || params['issueKeys'] === null) {
      return 'Параметр "issueKeys" обязателен';
    }

    // Проверка, что это массив (до validateRequired чтобы дать более понятное сообщение)
    if (!Array.isArray(params['issueKeys'])) {
      return 'Параметр issueKeys должен быть массивом строк';
    }

    const issueKeys = params['issueKeys'] as string[];

    // Проверка, что массив не пустой
    if (issueKeys.length === 0) {
      return 'Массив issueKeys не может быть пустым';
    }

    // Валидация каждого ключа задачи
    for (const issueKey of issueKeys) {
      if (typeof issueKey !== 'string') {
        return `Все элементы массива issueKeys должны быть строками, получен: ${typeof issueKey}`;
      }

      const formatError = this.validateIssueKey(issueKey);
      if (formatError) {
        return `Ошибка в ключе "${issueKey}": ${formatError}`;
      }
    }

    return null;
  }

  /**
   * Извлечение и валидация полей фильтрации
   * @param params - параметры запроса
   * @returns массив полей или undefined
   */
  private extractFields(params: ToolCallParams): string[] | undefined {
    if (params['fields'] === undefined) {
      return undefined;
    }

    // Валидация типа
    if (!Array.isArray(params['fields'])) {
      throw new Error('Параметр "fields" должен быть массивом строк');
    }

    // Валидация формата полей
    const fieldsValidationError = ResponseFieldFilter.validateFields(
      params['fields'] as string[]
    );
    if (fieldsValidationError) {
      throw new Error(fieldsValidationError);
    }

    // Нормализация (удаление дубликатов, сортировка)
    return ResponseFieldFilter.normalizeFields(params['fields'] as string[]);
  }
}
