/**
 * Параллельный исполнитель операций с контролем concurrency
 *
 * Ответственность (SRP):
 * - ТОЛЬКО параллельное выполнение операций с ограничением concurrency
 * - ТОЛЬКО агрегация результатов (успешных и неуспешных)
 * - ТОЛЬКО типобезопасная обработка Promise.allSettled
 * - ТОЛЬКО логирование метрик выполнения
 *
 * НЕ отвечает за:
 * - Retry логику (делегируется RetryHandler для каждой операции)
 * - HTTP запросы (принимает готовые функции)
 * - Бизнес-логику (работает с абстрактными операциями)
 *
 * Реализация:
 * - Использует p-limit для concurrency control (battle-tested, 20M+ загрузок/неделю)
 * - Добавляет слой логирования, метрик и типобезопасности поверх p-limit
 */

import pLimit from 'p-limit';
import type { Logger } from '../logging/index.js';
import type { BatchResult, FulfilledResult, RejectedResult } from '../types.js';

/**
 * Конфигурация ParallelExecutor
 */
export interface ParallelExecutorConfig {
  /** Максимальное количество элементов в batch-запросе (бизнес-лимит) */
  maxBatchSize: number;
  /** Максимальное количество одновременных операций (технический лимит для p-limit) */
  maxConcurrentRequests: number;
}

/**
 * Параллельный исполнитель операций
 *
 * Использует p-limit для concurrency control + добавляет:
 * - Валидацию batch-размера
 * - Детальное логирование (старт, завершение, ошибки)
 * - Подсчёт метрик (success/error counts, duration)
 * - Типобезопасные результаты (OperationResult discriminated union)
 */
export class ParallelExecutor {
  private readonly maxBatchSize: number;
  private readonly maxConcurrentRequests: number;

  constructor(
    private readonly logger: Logger,
    config: ParallelExecutorConfig
  ) {
    this.maxBatchSize = config.maxBatchSize;
    this.maxConcurrentRequests = config.maxConcurrentRequests;
  }

  /**
   * Выполняет массив операций параллельно с ограничением concurrency
   *
   * @param operations - массив объектов { key, fn } для выполнения
   * @param operationName - имя операции для логирования (например, "get issue")
   * @returns массив результатов (unified BatchResult формат)
   * @throws {Error} если количество операций превышает maxBatchSize
   *
   * @example
   * const operations = keys.map(key => ({
   *   key,
   *   fn: () => httpClient.get(`/v3/issues/${key}`)
   * }));
   * const result = await executor.executeParallel(operations, 'get issue');
   */
  async executeParallel<TKey, TValue>(
    operations: Array<{ key: TKey; fn: () => Promise<TValue> }>,
    operationName: string = 'operation'
  ): Promise<BatchResult<TKey, TValue>> {
    const totalCount = operations.length;

    // Валидация лимита batch-размера
    if (totalCount > this.maxBatchSize) {
      throw new Error(
        `Batch size ${totalCount} exceeds maximum allowed ${this.maxBatchSize}. ` +
          `Increase MAX_BATCH_SIZE or split the request into multiple batches.`
      );
    }

    this.logger.info(
      `Начинаю параллельное выполнение ${totalCount} операций: ${operationName} ` +
        `(concurrency limit: ${this.maxConcurrentRequests})`
    );

    const startTime = Date.now();
    const settledResults = await this.executeWithConcurrencyLimit(operations.map((op) => op.fn));
    const duration = Date.now() - startTime;

    const results = this.mapSettledResults(settledResults, operations);

    this.logCompletion(results, duration, operationName);
    this.logFailures(results, operationName);

    return results;
  }

  /**
   * Выполняет операции с ограничением одновременно выполняющихся запросов (throttling)
   *
   * Использует p-limit для concurrency control:
   * - Одновременно выполняется не более maxConcurrentRequests операций
   * - Когда одна операция завершается, следующая начинается
   * - Порядок результатов соответствует порядку входных операций
   * - Использует Promise.allSettled — все операции выполнятся даже при частичных ошибках
   *
   * @param operations - массив операций для выполнения
   * @returns массив результатов Promise.allSettled
   */
  private async executeWithConcurrencyLimit<T>(
    operations: Array<() => Promise<T>>
  ): Promise<PromiseSettledResult<T>[]> {
    const limit = pLimit(this.maxConcurrentRequests);

    // Оборачиваем каждую операцию в limit() — p-limit сам управляет очередью
    const limitedOperations = operations.map((operation) => limit(operation));

    // Promise.allSettled гарантирует, что все операции выполнятся
    // (даже если некоторые завершатся с ошибкой)
    return Promise.allSettled(limitedOperations);
  }

  /**
   * Преобразует PromiseSettledResult в unified BatchResult формат
   */
  private mapSettledResults<TKey, TValue>(
    settledResults: PromiseSettledResult<TValue>[],
    operations: Array<{ key: TKey; fn: () => Promise<TValue> }>
  ): BatchResult<TKey, TValue> {
    return settledResults.map(
      (result, index): FulfilledResult<TKey, TValue> | RejectedResult<TKey> => {
        // operations[index] exists because settledResults.length === operations.length
        const operation = operations[index];
        if (!operation) {
          throw new Error(`Missing operation at index ${index}`);
        }
        const key = operation.key;

        if (result.status === 'fulfilled') {
          return {
            status: 'fulfilled',
            key,
            value: result.value,
            index,
          };
        } else {
          return {
            status: 'rejected',
            key,
            reason:
              result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
            index,
          };
        }
      }
    );
  }

  /**
   * Логирует завершение выполнения операций
   */
  private logCompletion<TKey, TValue>(
    results: BatchResult<TKey, TValue>,
    duration: number,
    _operationName: string
  ): void {
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const errorCount = results.filter((r) => r.status === 'rejected').length;
    const totalCount = results.length;

    this.logger.info(
      `Завершено параллельное выполнение за ${duration}ms. ` +
        `Успешно: ${successCount}/${totalCount}, ` +
        `Ошибок: ${errorCount}/${totalCount}`
    );
  }

  /**
   * Логирует неудачные операции
   */
  private logFailures<TKey, TValue>(
    results: BatchResult<TKey, TValue>,
    operationName: string
  ): void {
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Операция #${idx} (${operationName}, key=${String(result.key)}) не удалась: ${result.reason.message}`
        );
      }
    });
  }

  /**
   * Вспомогательный метод для выполнения операций с маппингом входных данных
   *
   * @param inputs - массив входных данных
   * @param operationFactory - фабрика, создающая операцию для каждого входа
   * @param operationName - имя операции для логирования
   * @returns массив результатов (unified BatchResult формат)
   *
   * @example
   * const result = await executor.executeMapped(
   *   ['QUEUE-1', 'QUEUE-2'],
   *   (key) => () => httpClient.get(`/v3/issues/${key}`),
   *   'get issue'
   * );
   */
  async executeMapped<TKey extends TInput, TInput, TValue>(
    inputs: TInput[],
    operationFactory: (input: TInput) => () => Promise<TValue>,
    operationName: string = 'operation'
  ): Promise<BatchResult<TKey, TValue>> {
    const operations = inputs.map((input) => ({
      key: input as TKey,
      fn: operationFactory(input),
    }));
    return this.executeParallel(operations, operationName);
  }

  /**
   * Проверяет, все ли операции завершились успешно
   *
   * @param results - массив результатов выполнения
   * @returns true, если все операции успешны
   */
  static isAllSuccess<TKey, TValue>(results: BatchResult<TKey, TValue>): boolean {
    return results.every((r) => r.status === 'fulfilled');
  }

  /**
   * Проверяет, есть ли хотя бы одна ошибка
   *
   * @param results - массив результатов выполнения
   * @returns true, если есть ошибки
   */
  static hasErrors<TKey, TValue>(results: BatchResult<TKey, TValue>): boolean {
    return results.some((r) => r.status === 'rejected');
  }

  /**
   * Получает только успешные результаты
   *
   * @param results - массив результатов выполнения
   * @returns массив данных успешных операций
   */
  static getSuccessfulResults<TKey, TValue>(results: BatchResult<TKey, TValue>): TValue[] {
    return results
      .filter(
        (r): r is Extract<BatchResult<TKey, TValue>[number], { status: 'fulfilled' }> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);
  }

  /**
   * Получает только ошибки
   *
   * @param results - массив результатов выполнения
   * @returns массив ошибок неудачных операций
   */
  static getErrors<TKey, TValue>(results: BatchResult<TKey, TValue>): Error[] {
    return results
      .filter(
        (r): r is Extract<BatchResult<TKey, TValue>[number], { status: 'rejected' }> =>
          r.status === 'rejected'
      )
      .map((r) => r.reason);
  }
}
