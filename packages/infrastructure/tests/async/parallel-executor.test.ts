/**
 * Unit тесты для ParallelExecutor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { ApiError } from '@types';

/**
 * Создаёт мок логгера для тестов
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;
}

/**
 * Создаёт мок ApiError (наследуется от Error для правильной обработки в ParallelExecutor)
 */
function createMockApiError(message: string, _statusCode: number = 500): Error & ApiError {
  const error = new Error(message) as Error & ApiError;
  // error.statusCode = statusCode;
  // error.isRetryable = false;
  // error.timestamp = new Date();
  return error;
}

describe('ParallelExecutor', () => {
  let executor: ParallelExecutor;
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    executor = new ParallelExecutor(logger, {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    });
  });

  describe('executeParallel', () => {
    it('должен успешно выполнить все операции', async () => {
      // Arrange
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        { key: 'key2', fn: async (): Promise<string> => 'result2' },
        { key: 'key3', fn: async (): Promise<string> => 'result3' },
      ];

      // Act
      const result = await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(result).toHaveLength(3);
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(3);

      // Проверяем успешные результаты
      expect(result[0]?.status).toBe('fulfilled');
      if (result[0]?.status === 'fulfilled') {
        expect(result[0].key).toBe('key1');
        expect(result[0].value).toBe('result1');
        expect(result[0].index).toBe(0);
      }

      expect(result[1]?.status).toBe('fulfilled');
      if (result[1]?.status === 'fulfilled') {
        expect(result[1].key).toBe('key2');
        expect(result[1].value).toBe('result2');
        expect(result[1].index).toBe(1);
      }

      expect(result[2]?.status).toBe('fulfilled');
      if (result[2]?.status === 'fulfilled') {
        expect(result[2].key).toBe('key3');
        expect(result[2].value).toBe('result3');
        expect(result[2].index).toBe(2);
      }
    });

    it('должен обработать частичные неудачи', async () => {
      // Arrange
      const error = createMockApiError('Test error', 500);
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
        { key: 'key3', fn: async (): Promise<string> => 'result3' },
      ];

      // Act
      const result = await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(result).toHaveLength(3);
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      const rejectedResults = result.filter((r) => r.status === 'rejected');
      expect(fulfilledResults).toHaveLength(2);
      expect(rejectedResults).toHaveLength(1);

      // Успешные операции
      expect(result[0]?.status).toBe('fulfilled');
      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value).toBe('result1');
        expect(result[0].key).toBe('key1');
      }

      // Неудачная операция
      expect(result[1]?.status).toBe('rejected');
      if (result[1]?.status === 'rejected') {
        expect(result[1].reason.message).toBe('Test error');
        expect(result[1].key).toBe('key2');
        expect(result[1].index).toBe(1);
      }

      // Снова успешная
      expect(result[2]?.status).toBe('fulfilled');
      if (result[2]?.status === 'fulfilled') {
        expect(result[2].value).toBe('result3');
        expect(result[2].key).toBe('key3');
      }
    });

    it('должен обработать случай, когда все операции неудачны', async () => {
      // Arrange
      const error1 = createMockApiError('Error 1', 500);
      const error2 = createMockApiError('Error 2', 404);
      const operations = [
        {
          key: 'key1',
          fn: async (): Promise<string> => {
            throw error1;
          },
        },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error2;
          },
        },
      ];

      // Act
      const result = await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(result).toHaveLength(2);
      const rejectedResults = result.filter((r) => r.status === 'rejected');
      expect(rejectedResults).toHaveLength(2);

      expect(result[0]?.status).toBe('rejected');
      if (result[0]?.status === 'rejected') {
        expect(result[0].reason.message).toBe('Error 1');
        expect(result[0].key).toBe('key1');
      }

      expect(result[1]?.status).toBe('rejected');
      if (result[1]?.status === 'rejected') {
        expect(result[1].reason.message).toBe('Error 2');
        expect(result[1].key).toBe('key2');
      }
    });

    it('должен обрабатывать пустой массив операций', async () => {
      // Arrange
      const operations: Array<{ key: string; fn: () => Promise<string> }> = [];

      // Act
      const result = await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('должен логировать начало и окончание выполнения', async () => {
      // Arrange
      const operations = [{ key: 'key1', fn: async (): Promise<string> => 'result1' }];

      // Act
      await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Начинаю параллельное выполнение 1 операций: test operation (concurrency limit: 5)'
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Завершено параллельное выполнение за')
      );
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Успешно: 1/1'));
    });

    it('должен логировать неудачные операции', async () => {
      // Arrange
      const error = createMockApiError('Test error', 500);
      const operations = [
        {
          key: 'test-key',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
      ];

      // Act
      await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'Операция #0 (test operation, key=test-key) не удалась: Test error'
      );
    });
  });

  describe('executeMapped', () => {
    it('должен выполнить операции с маппингом входных данных', async () => {
      // Arrange
      const inputs = ['key1', 'key2', 'key3'];
      const operationFactory = (key: string) => async (): Promise<string> => `result-${key}`;

      // Act
      const result = await executor.executeMapped(inputs, operationFactory, 'mapped operation');

      // Assert
      expect(result).toHaveLength(3);
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(3);

      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value).toBe('result-key1');
        expect(result[0].key).toBe('key1');
      }
      if (result[1]?.status === 'fulfilled') {
        expect(result[1].value).toBe('result-key2');
        expect(result[1].key).toBe('key2');
      }
      if (result[2]?.status === 'fulfilled') {
        expect(result[2].value).toBe('result-key3');
        expect(result[2].key).toBe('key3');
      }
    });

    it('должен обрабатывать ошибки при маппинге', async () => {
      // Arrange
      const inputs = ['key1', 'key2'];
      const error = createMockApiError('Mapping error', 500);

      const operationFactory = (key: string) => async (): Promise<string> => {
        if (key === 'key2') {
          throw error;
        }
        return `result-${key}`;
      };

      // Act
      const result = await executor.executeMapped(inputs, operationFactory, 'mapped operation');

      // Assert
      expect(result).toHaveLength(2);
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      const rejectedResults = result.filter((r) => r.status === 'rejected');
      expect(fulfilledResults).toHaveLength(1);
      expect(rejectedResults).toHaveLength(1);

      expect(result[0]?.status).toBe('fulfilled');
      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value).toBe('result-key1');
      }

      expect(result[1]?.status).toBe('rejected');
      if (result[1]?.status === 'rejected') {
        expect(result[1].reason.message).toBe('Mapping error');
      }
    });
  });

  describe('isAllSuccess (статический метод)', () => {
    it('должен вернуть true, если все операции успешны', async () => {
      // Arrange
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        { key: 'key2', fn: async (): Promise<string> => 'result2' },
      ];
      const result = await executor.executeParallel(operations);

      // Act & Assert
      expect(ParallelExecutor.isAllSuccess(result)).toBe(true);
    });

    it('должен вернуть false, если есть хотя бы одна ошибка', async () => {
      // Arrange
      const error = createMockApiError('Error', 500);
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
      ];
      const result = await executor.executeParallel(operations);

      // Act & Assert
      expect(ParallelExecutor.isAllSuccess(result)).toBe(false);
    });
  });

  describe('hasErrors (статический метод)', () => {
    it('должен вернуть false, если все операции успешны', async () => {
      // Arrange
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        { key: 'key2', fn: async (): Promise<string> => 'result2' },
      ];
      const result = await executor.executeParallel(operations);

      // Act & Assert
      expect(ParallelExecutor.hasErrors(result)).toBe(false);
    });

    it('должен вернуть true, если есть хотя бы одна ошибка', async () => {
      // Arrange
      const error = createMockApiError('Error', 500);
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
      ];
      const result = await executor.executeParallel(operations);

      // Act & Assert
      expect(ParallelExecutor.hasErrors(result)).toBe(true);
    });
  });

  describe('getSuccessfulResults (статический метод)', () => {
    it('должен вернуть только успешные результаты', async () => {
      // Arrange
      const error = createMockApiError('Error', 500);
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
        { key: 'key3', fn: async (): Promise<string> => 'result3' },
      ];
      const result = await executor.executeParallel(operations);

      // Act
      const successResults = ParallelExecutor.getSuccessfulResults(result);

      // Assert
      expect(successResults).toHaveLength(2);
      expect(successResults).toEqual(['result1', 'result3']);
    });

    it('должен вернуть пустой массив, если нет успешных результатов', async () => {
      // Arrange
      const error = createMockApiError('Error', 500);
      const operations = [
        {
          key: 'key1',
          fn: async (): Promise<string> => {
            throw error;
          },
        },
      ];
      const result = await executor.executeParallel(operations);

      // Act
      const successResults = ParallelExecutor.getSuccessfulResults(result);

      // Assert
      expect(successResults).toHaveLength(0);
    });
  });

  describe('getErrors (статический метод)', () => {
    it('должен вернуть только ошибки', async () => {
      // Arrange
      const error1 = createMockApiError('Error 1', 500);
      const error2 = createMockApiError('Error 2', 404);
      const operations = [
        { key: 'key1', fn: async (): Promise<string> => 'result1' },
        {
          key: 'key2',
          fn: async (): Promise<string> => {
            throw error1;
          },
        },
        {
          key: 'key3',
          fn: async (): Promise<string> => {
            throw error2;
          },
        },
      ];
      const result = await executor.executeParallel(operations);

      // Act
      const errors = ParallelExecutor.getErrors(result);

      // Assert
      expect(errors).toHaveLength(2);
      expect(errors[0]?.message).toBe('Error 1');
      expect(errors[1]?.message).toBe('Error 2');
    });

    it('должен вернуть пустой массив, если нет ошибок', async () => {
      // Arrange
      const operations = [{ key: 'key1', fn: async (): Promise<string> => 'result1' }];
      const result = await executor.executeParallel(operations);

      // Act
      const errors = ParallelExecutor.getErrors(result);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('валидация maxBatchSize', () => {
    it('должен выбросить ошибку, если количество операций превышает maxBatchSize', async () => {
      // Arrange
      const operations = Array.from({ length: 101 }, (_, i) => ({
        key: `key${i}`,
        fn: async (): Promise<string> => `result${i}`,
      }));

      // Act & Assert
      await expect(executor.executeParallel(operations, 'test operation')).rejects.toThrow(
        'Batch size 101 exceeds maximum allowed 100'
      );
    });

    it('должен успешно выполнить операции, если их количество равно maxBatchSize', async () => {
      // Arrange
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `key${i}`,
        fn: async (): Promise<string> => `result${i}`,
      }));

      // Act
      const result = await executor.executeParallel(operations, 'test operation');

      // Assert
      expect(result).toHaveLength(100);
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(100);
    });
  });

  describe('throttling (concurrency limit)', () => {
    it('должен ограничивать количество одновременно выполняющихся операций', async () => {
      // Arrange
      const maxConcurrent = 3;
      const executorWithSmallLimit = new ParallelExecutor(logger, {
        maxBatchSize: 100,
        maxConcurrentRequests: maxConcurrent,
      });

      let activeCount = 0;
      let maxObservedConcurrent = 0;

      const operations = Array.from({ length: 10 }, (_, i) => ({
        key: `key${i}`,
        fn: async (): Promise<string> => {
          activeCount++;
          maxObservedConcurrent = Math.max(maxObservedConcurrent, activeCount);
          await new Promise((resolve) => setTimeout(resolve, 10));
          activeCount--;
          return 'result';
        },
      }));

      // Act
      const result = await executorWithSmallLimit.executeParallel(
        operations,
        'throttled operations'
      );

      // Assert
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(10);
      expect(maxObservedConcurrent).toBeLessThanOrEqual(maxConcurrent);
      expect(maxObservedConcurrent).toBeGreaterThan(0);
    });

    it('должен выполнять операции в правильном порядке (результаты соответствуют входным данным)', async () => {
      // Arrange
      const inputs = [1, 2, 3, 4, 5];
      const operations = inputs.map((num) => ({
        key: num,
        fn: async (): Promise<number> => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
          return num * 2;
        },
      }));

      // Act
      const result = await executor.executeParallel(operations, 'ordered operations');

      // Assert
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(5);
      const successResults = ParallelExecutor.getSuccessfulResults(result);
      expect(successResults).toEqual([2, 4, 6, 8, 10]); // Порядок сохранён
    });
  });

  describe('интеграция с реальными операциями', () => {
    it('должен корректно выполнять параллельные промисы с задержками', async () => {
      // Arrange
      const delay = (ms: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const operations = [
        {
          key: 'slow1',
          fn: async (): Promise<string> => {
            await delay(10);
            return 'slow1';
          },
        },
        {
          key: 'fast',
          fn: async (): Promise<string> => {
            await delay(5);
            return 'fast';
          },
        },
        {
          key: 'slow2',
          fn: async (): Promise<string> => {
            await delay(10);
            return 'slow2';
          },
        },
      ];

      const startTime = Date.now();

      // Act
      const result = await executor.executeParallel(operations, 'delayed operations');
      const duration = Date.now() - startTime;

      // Assert
      const fulfilledResults = result.filter((r) => r.status === 'fulfilled');
      expect(fulfilledResults).toHaveLength(3);
      // Параллельное выполнение должно занять ~10ms, а не 25ms (последовательно)
      expect(duration).toBeLessThan(50); // Даём запас на медленные CI

      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value).toBe('slow1');
      }
      if (result[1]?.status === 'fulfilled') {
        expect(result[1].value).toBe('fast');
      }
      if (result[2]?.status === 'fulfilled') {
        expect(result[2].value).toBe('slow2');
      }
    });
  });
});
