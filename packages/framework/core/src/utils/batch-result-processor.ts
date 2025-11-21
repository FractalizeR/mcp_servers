/**
 * Утилита для обработки результатов batch-операций
 *
 * Переиспользуемая логика для:
 * - Разделения успешных и неудачных результатов
 * - Применения фильтров к данным
 * - Стандартизированного форматирования результатов
 *
 * ОБНОВЛЕНО:
 * - Поддерживает unified BatchResult формат (с generic TKey)
 * - Сохраняет полную информацию об ApiErrorClass (statusCode, errors, retryAfter)
 */

import type {
  BatchResult,
  FulfilledResult,
  RejectedResult,
  ApiErrorDetails,
} from '@mcp-framework/infrastructure';
import { ApiErrorClass } from '@mcp-framework/infrastructure';

/**
 * Обработанный результат batch-операции
 *
 * Generic параметры:
 * - TKey: тип ключа сущности (string, number, etc.)
 * - TValue: тип данных результата
 */
export interface ProcessedBatchResult<TKey, TValue> {
  /** Успешно обработанные элементы */
  successful: Array<{ key: TKey; data: TValue }>;
  /** Неудачные элементы с описанием ошибок */
  failed: Array<{ key: TKey; error: ApiErrorDetails | string }>;
}

/**
 * Процессор для обработки результатов batch-операций
 *
 * Соблюдает SRP: только преобразование BatchResult в удобный формат
 */
export class BatchResultProcessor {
  /**
   * Обработать результаты batch-операции
   *
   * @param results - результаты batch-операции (unified формат)
   * @param filterFn - опциональная функция фильтрации данных (например, ResponseFieldFilter)
   * @returns обработанные результаты с разделением на успешные и неудачные
   *
   * @example
   * // Обработка результатов задач
   * const results: BatchResult<string, Issue> = await operation.execute(keys);
   * const processed = BatchResultProcessor.process(results, (issue) =>
   *   ResponseFieldFilter.filter(issue, ['key', 'summary'])
   * );
   */
  static process<TKey, TInputValue, TOutputValue = TInputValue>(
    results: BatchResult<TKey, TInputValue>,
    filterFn?: (item: TInputValue) => TOutputValue
  ): ProcessedBatchResult<TKey, TOutputValue> {
    const successful: Array<{ key: TKey; data: TOutputValue }> = [];
    const failed: Array<{ key: TKey; error: ApiErrorDetails | string }> = [];

    for (const result of results) {
      if (this.isFulfilledResult(result)) {
        // Type Guard: когда status === 'fulfilled', value всегда определено
        if (!result.value) {
          failed.push({
            key: result.key,
            error: 'Сущность не найдена (пустой результат)',
          });
          continue;
        }

        // Применяем фильтр если указан, иначе используем данные как есть
        const data: TOutputValue = filterFn
          ? filterFn(result.value)
          : (result.value as TOutputValue);

        successful.push({
          key: result.key,
          data,
        });
      } else {
        // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Сохраняем полную информацию об ApiErrorClass
        // - Если ApiErrorClass → используем toJSON() (statusCode, message, errors, retryAfter)
        // - Если обычный Error → только message
        // - Иначе → String(reason)
        let error: ApiErrorDetails | string;
        if (result.reason instanceof ApiErrorClass) {
          error = result.reason.toJSON();
        } else if (result.reason instanceof Error) {
          error = result.reason.message;
        } else {
          error = String(result.reason);
        }

        failed.push({
          key: result.key,
          error,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Type guard для проверки успешного результата
   */
  private static isFulfilledResult<TKey, TValue>(
    result: FulfilledResult<TKey, TValue> | RejectedResult<TKey>
  ): result is FulfilledResult<TKey, TValue> {
    return result.status === 'fulfilled';
  }
}
