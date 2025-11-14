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
import type { Logger } from '@infrastructure/logger.js';
import type { ApiError } from '@types';

/**
 * Результат выполнения одной операции (Discriminated Union)
 *
 * ВАЖНО: Использование discriminated union гарантирует типобезопасность:
 * - Невозможно создать невалидное состояние (success=true + error)
 * - TypeScript автоматически делает type narrowing
 * - Меньше проверок на undefined в коде
 */
export type OperationResult<T> =
  | {
      /** Статус операции: успех */
      readonly status: 'success';
      /** Данные результата */
      readonly data: T;
      /** Индекс в исходном массиве для сопоставления */
      readonly index: number;
    }
  | {
      /** Статус операции: ошибка */
      readonly status: 'error';
      /** Ошибка выполнения */
      readonly error: ApiError;
      /** Индекс в исходном массиве для сопоставления */
      readonly index: number;
    };

/**
 * Результат выполнения пакета операций
 */
export interface BatchResult<T> {
  readonly results: ReadonlyArray<OperationResult<T>>;
  readonly successCount: number;
  readonly errorCount: number;
  readonly totalCount: number;
}

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
   * @param operations - массив асинхронных функций для выполнения
   * @param operationName - имя операции для логирования (например, "get issue")
   * @returns агрегированный результат выполнения всех операций
   * @throws {Error} если количество операций превышает maxBatchSize
   *
   * @example
   * const operations = keys.map(key => () => httpClient.get(`/v3/issues/${key}`));
   * const result = await executor.executeParallel(operations, 'get issue');
   */
  async executeParallel<T>(
    operations: Array<() => Promise<T>>,
    operationName: string = 'operation'
  ): Promise<BatchResult<T>> {
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
    const settledResults = await this.executeWithConcurrencyLimit(operations);
    const duration = Date.now() - startTime;

    const results = this.mapSettledResults(settledResults);
    const stats = this.calculateStats(results, totalCount);

    this.logCompletion(stats, duration, operationName);
    this.logFailures(results, operationName);

    return {
      results,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      totalCount,
    };
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
   * Преобразует PromiseSettledResult в наш формат OperationResult
   */
  private mapSettledResults<T>(
    settledResults: PromiseSettledResult<T>[]
  ): OperationResult<T>[] {
    return settledResults.map((result, index): OperationResult<T> => {
      if (result.status === 'fulfilled') {
        return {
          status: 'success',
          data: result.value,
          index,
        };
      } else {
        return {
          status: 'error',
          error: result.reason as ApiError,
          index,
        };
      }
    });
  }

  /**
   * Подсчитывает статистику выполнения операций
   */
  private calculateStats<T>(
    results: OperationResult<T>[],
    totalCount: number
  ): { successCount: number; errorCount: number; totalCount: number } {
    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return { successCount, errorCount, totalCount };
  }

  /**
   * Логирует завершение выполнения операций
   */
  private logCompletion(
    stats: { successCount: number; errorCount: number; totalCount: number },
    duration: number,
    _operationName: string
  ): void {
    this.logger.info(
      `Завершено параллельное выполнение за ${duration}ms. ` +
      `Успешно: ${stats.successCount}/${stats.totalCount}, ` +
      `Ошибок: ${stats.errorCount}/${stats.totalCount}`
    );
  }

  /**
   * Логирует неудачные операции
   */
  private logFailures<T>(
    results: OperationResult<T>[],
    operationName: string
  ): void {
    results.forEach((result, idx) => {
      if (result.status === 'error') {
        this.logger.warn(
          `Операция #${idx} (${operationName}) не удалась: ${result.error.message}`
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
   * @returns агрегированный результат
   *
   * @example
   * const result = await executor.executeMapped(
   *   ['QUEUE-1', 'QUEUE-2'],
   *   (key) => () => httpClient.get(`/v3/issues/${key}`),
   *   'get issue'
   * );
   */
  async executeMapped<TInput, TOutput>(
    inputs: TInput[],
    operationFactory: (input: TInput) => () => Promise<TOutput>,
    operationName: string = 'operation'
  ): Promise<BatchResult<TOutput>> {
    const operations = inputs.map(operationFactory);
    return this.executeParallel(operations, operationName);
  }

  /**
   * Проверяет, все ли операции завершились успешно
   *
   * @param result - результат выполнения пакета
   * @returns true, если все операции успешны
   */
  static isAllSuccess<T>(result: BatchResult<T>): boolean {
    return result.errorCount === 0;
  }

  /**
   * Проверяет, есть ли хотя бы одна ошибка
   *
   * @param result - результат выполнения пакета
   * @returns true, если есть ошибки
   */
  static hasErrors<T>(result: BatchResult<T>): boolean {
    return result.errorCount > 0;
  }

  /**
   * Получает только успешные результаты
   *
   * @param result - результат выполнения пакета
   * @returns массив данных успешных операций
   */
  static getSuccessfulResults<T>(result: BatchResult<T>): T[] {
    return result.results
      .filter((r): r is Extract<OperationResult<T>, { status: 'success' }> => r.status === 'success')
      .map((r) => r.data);
  }

  /**
   * Получает только ошибки
   *
   * @param result - результат выполнения пакета
   * @returns массив ошибок неудачных операций
   */
  static getErrors<T>(result: BatchResult<T>): ApiError[] {
    return result.results
      .filter((r): r is Extract<OperationResult<T>, { status: 'error' }> => r.status === 'error')
      .map((r) => r.error);
  }
}
