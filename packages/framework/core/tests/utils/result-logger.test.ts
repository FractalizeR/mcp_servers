import { describe, it, expect, vi } from 'vitest';
import { ResultLogger } from '../../src/utils/result-logger.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { ProcessedBatchResult } from '../../src/utils/batch-result-processor.js';

describe('ResultLogger', () => {
  const createMockLogger = (): Logger =>
    ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
      setAlertingTransport: vi.fn(),
    }) as unknown as Logger;

  describe('logBatchResults', () => {
    it('должен логировать результаты batch-операции', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 10,
        successCount: 8,
        failedCount: 2,
        fieldsCount: 5,
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config);

      expect(logger.debug).toHaveBeenCalledWith('Операция завершена (10 шт.)', {
        successful: 8,
        failed: 2,
        fieldsCount: 5,
      });
    });

    it('должен логировать с fieldsCount = "all"', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 5,
        successCount: 5,
        failedCount: 0,
        fieldsCount: 'all' as const,
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config);

      expect(logger.debug).toHaveBeenCalledWith('Операция завершена (5 шт.)', {
        successful: 5,
        failed: 0,
        fieldsCount: 'all',
      });
    });

    it('должен логировать статистику размеров если есть успешные результаты', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 3,
        successCount: 3,
        failedCount: 0,
        fieldsCount: 5,
      };
      const results: ProcessedBatchResult<string, { key: string; summary: string }> = {
        successful: [
          { key: 'PROJ-1', data: { key: 'PROJ-1', summary: 'Task 1' } },
          { key: 'PROJ-2', data: { key: 'PROJ-2', summary: 'Task 2' } },
          { key: 'PROJ-3', data: { key: 'PROJ-3', summary: 'Task 3' } },
        ],
        failed: [],
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config, results);

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(2, 'Статистика размеров ответа', {
        totalSize: expect.any(Number),
        averageSize: expect.any(Number),
        itemsCount: 3,
      });
    });

    it('не должен логировать статистику размеров если нет успешных результатов', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 2,
        successCount: 0,
        failedCount: 2,
        fieldsCount: 5,
      };
      const results: ProcessedBatchResult<string, { key: string }> = {
        successful: [],
        failed: [
          { key: 'PROJ-1', error: 'Not found' },
          { key: 'PROJ-2', error: 'Access denied' },
        ],
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config, results);

      expect(logger.debug).toHaveBeenCalledTimes(1);
    });

    it('не должен логировать статистику размеров если results не переданы', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 5,
        successCount: 5,
        failedCount: 0,
        fieldsCount: 'all' as const,
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config);

      expect(logger.debug).toHaveBeenCalledTimes(1);
    });

    it('должен корректно вычислять средний размер', () => {
      const logger = createMockLogger();
      const config = {
        totalRequested: 2,
        successCount: 2,
        failedCount: 0,
        fieldsCount: 3,
      };
      const results: ProcessedBatchResult<string, { key: string }> = {
        successful: [
          { key: 'PROJ-1', data: { key: 'PROJ-1' } }, // ~19 bytes
          { key: 'PROJ-2', data: { key: 'PROJ-2' } }, // ~19 bytes
        ],
        failed: [],
      };

      ResultLogger.logBatchResults(logger, 'Операция завершена', config, results);

      const statsCall = (logger.debug as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === 'Статистика размеров ответа'
      );

      expect(statsCall).toBeDefined();
      expect(statsCall![1].averageSize).toBeGreaterThan(0);
    });
  });

  describe('logOperationStart', () => {
    it('должен логировать начало операции с указанными полями', () => {
      const logger = createMockLogger();
      const fields = ['key', 'summary', 'status'];

      ResultLogger.logOperationStart(logger, 'Получение задач', 10, fields);

      expect(logger.info).toHaveBeenCalledWith('Получение задач: 10', {
        itemsCount: 10,
        fields: 3,
      });
    });

    it('должен логировать начало операции без фильтрации полей', () => {
      const logger = createMockLogger();

      ResultLogger.logOperationStart(logger, 'Получение задач', 5);

      expect(logger.info).toHaveBeenCalledWith('Получение задач: 5', {
        itemsCount: 5,
        fields: 'all',
      });
    });

    it('должен логировать начало операции с пустым массивом полей', () => {
      const logger = createMockLogger();

      ResultLogger.logOperationStart(logger, 'Получение задач', 3, []);

      expect(logger.info).toHaveBeenCalledWith('Получение задач: 3', {
        itemsCount: 3,
        fields: 0,
      });
    });
  });
});
