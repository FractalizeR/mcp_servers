/**
 * Утилита для стандартизированного логирования результатов batch-операций
 *
 * Переиспользуемая логика для:
 * - Логирования успешных и неудачных результатов
 * - Подсчёта статистики размеров ответов
 * - Единообразного формата логов во всех tools
 */

import type { Logger } from '@mcp-framework/infrastructure';
import type { ProcessedBatchResult } from './batch-result-processor.js';

/**
 * Конфигурация для логирования результатов
 */
export interface ResultLogConfig {
  /** Общее количество запрошенных элементов */
  totalRequested: number;
  /** Количество успешных результатов */
  successCount: number;
  /** Количество неудачных результатов */
  failedCount: number;
  /** Количество полей в фильтре (или 'all' если фильтр не применялся) */
  fieldsCount: number | 'all';
}

/**
 * Логгер результатов batch-операций
 *
 * Соблюдает SRP: только логирование результатов операций
 */
export class ResultLogger {
  /**
   * Залогировать результаты batch-операции
   *
   * @param logger - инстанс логгера
   * @param operationName - название операции (например, "Задачи получены")
   * @param config - конфигурация логирования
   * @param results - обработанные результаты для детальной статистики
   */
  static logBatchResults<TKey, TValue>(
    logger: Logger,
    operationName: string,
    config: ResultLogConfig,
    results?: ProcessedBatchResult<TKey, TValue>
  ): void {
    logger.debug(`${operationName} (${config.totalRequested} шт.)`, {
      successful: config.successCount,
      failed: config.failedCount,
      fieldsCount: config.fieldsCount,
    });

    // Логируем детальную статистику по размерам (только если есть успешные результаты)
    if (results && results.successful.length > 0) {
      const totalSize = results.successful.reduce(
        (sum, item) => sum + JSON.stringify(item.data).length,
        0
      );

      logger.debug('Статистика размеров ответа', {
        totalSize,
        averageSize: Math.round(totalSize / results.successful.length),
        itemsCount: results.successful.length,
      });
    }
  }

  /**
   * Залогировать начало операции
   *
   * @param logger - инстанс логгера
   * @param operationName - название операции
   * @param itemsCount - количество обрабатываемых элементов
   * @param fields - массив полей для фильтрации (или undefined если фильтр не применяется)
   */
  static logOperationStart(
    logger: Logger,
    operationName: string,
    itemsCount: number,
    fields?: string[]
  ): void {
    logger.info(`${operationName}: ${itemsCount}`, {
      itemsCount,
      fields: fields ? fields.length : 'all',
    });
  }
}
