/**
 * Batch-операция удаления нескольких задач параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление нескольких задач (batch-режим)
 * - Параллельное выполнение запросов через Promise.allSettled
 * - Валидация количества запросов против maxParallelRequests
 * - НЕТ получения/создания/обновления
 * - НЕТ кеширования (DELETE не кешируется)
 */

import { BaseOperation } from '@domain/operations/base-operation.js';

/**
 * Результат batch-операции для одного удаления задачи
 */
export interface BatchDeleteIssueResult {
  /** Статус операции */
  status: 'fulfilled' | 'rejected';
  /** Ключ задачи */
  issueKey: string;
  /** Причина ошибки (если провал) */
  reason?: Error;
}

export class DeleteIssuesOperation extends BaseOperation {
  /**
   * Удаляет несколько задач параллельно
   * @param issueKeys - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи
   * @throws {Error} если количество запросов превышает maxBatchSize (валидация в ParallelExecutor)
   */
  async execute(issueKeys: string[]): Promise<BatchDeleteIssueResult[]> {
    // Проверка на пустой массив
    if (issueKeys.length === 0) {
      this.logger.warn('DeleteIssuesOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(`Удаление ${issueKeys.length} задач параллельно: ${issueKeys.join(', ')}`);

    // Создаем массив промисов для параллельного выполнения
    const promises = issueKeys.map(async (issueKey): Promise<void> => {
      // DELETE запросы НЕ кешируются, только retry
      return this.withRetry(() =>
        this.httpClient.delete(`/v3/issues/${issueKey}`)
      );
    });

    // Выполняем все запросы параллельно с Promise.allSettled
    const results = await Promise.allSettled(promises);

    // Преобразуем результаты в BatchDeleteIssueResult с привязкой к оригинальным ключам
    return results.map((result, index) => {
      const issueKey = issueKeys[index] as string; // Safe: index всегда в пределах массива

      if (result.status === 'fulfilled') {
        return {
          status: 'fulfilled',
          issueKey,
        };
      } else {
        this.logger.error(`Ошибка удаления задачи ${issueKey}:`, result.reason);
        return {
          status: 'rejected',
          issueKey,
          reason: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        };
      }
    });
  }
}
