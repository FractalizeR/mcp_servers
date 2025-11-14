/**
 * Batch-операция создания нескольких задач параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание нескольких задач (batch-режим)
 * - Параллельное выполнение запросов через Promise.allSettled
 * - Валидация количества запросов против maxParallelRequests
 * - НЕТ получения/обновления/удаления
 * - НЕТ кеширования (POST не кешируется)
 */

import { BaseOperation } from '@domain/operations/base-operation.js';
import type { Issue, CreateIssueRequest } from '@domain/entities/issue.entity.js';

/**
 * Результат batch-операции для одного создания задачи
 */
export interface BatchCreateIssueResult {
  /** Статус операции */
  status: 'fulfilled' | 'rejected';
  /** Индекс запроса в исходном массиве */
  index: number;
  /** Созданная задача (если успех) */
  value?: Issue;
  /** Причина ошибки (если провал) */
  reason?: Error;
}

export class CreateIssuesOperation extends BaseOperation {
  /**
   * Создаёт несколько задач параллельно
   * @param requests - массив параметров создания задач
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные запросы
   * @throws {Error} если количество запросов превышает maxBatchSize (валидация в ParallelExecutor)
   */
  async execute(requests: CreateIssueRequest[]): Promise<BatchCreateIssueResult[]> {
    // Проверка на пустой массив
    if (requests.length === 0) {
      this.logger.warn('CreateIssuesOperation: пустой массив запросов');
      return [];
    }

    this.logger.info(`Создание ${requests.length} задач параллельно`);

    // Создаем массив промисов для параллельного выполнения
    const promises = requests.map(async (request): Promise<Issue> => {
      // POST запросы НЕ кешируются, только retry
      return this.withRetry(() =>
        this.httpClient.post<Issue>('/v3/issues', request)
      );
    });

    // Выполняем все запросы параллельно с Promise.allSettled
    const results = await Promise.allSettled(promises);

    // Преобразуем результаты в BatchCreateIssueResult с привязкой к индексам
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          status: 'fulfilled',
          index,
          value: result.value,
        };
      } else {
        this.logger.error(`Ошибка создания задачи (индекс ${index}):`, result.reason);
        return {
          status: 'rejected',
          index,
          reason: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        };
      }
    });
  }
}
