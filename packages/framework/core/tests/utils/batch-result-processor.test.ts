import { describe, it, expect } from 'vitest';
import { BatchResultProcessor } from '../../src/utils/batch-result-processor.js';
import type { BatchResult } from '@mcp-framework/infrastructure/types.js';

describe('BatchResultProcessor', () => {
  describe('process', () => {
    it('должен обработать пустой массив результатов', () => {
      const results: BatchResult<string, { key: string }> = [];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([]);
      expect(processed.failed).toEqual([]);
    });

    it('должен обработать только успешные результаты', () => {
      const results: BatchResult<string, { key: string; summary: string }> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: { key: 'PROJ-1', summary: 'Task 1' },
          index: 0,
        },
        {
          status: 'fulfilled',
          key: 'PROJ-2',
          value: { key: 'PROJ-2', summary: 'Task 2' },
          index: 1,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([
        { key: 'PROJ-1', data: { key: 'PROJ-1', summary: 'Task 1' } },
        { key: 'PROJ-2', data: { key: 'PROJ-2', summary: 'Task 2' } },
      ]);
      expect(processed.failed).toEqual([]);
    });

    it('должен обработать только неудачные результаты', () => {
      const results: BatchResult<string, { key: string }> = [
        {
          status: 'rejected',
          key: 'PROJ-1',
          reason: new Error('Not found'),
          index: 0,
        },
        {
          status: 'rejected',
          key: 'PROJ-2',
          reason: new Error('Access denied'),
          index: 1,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([]);
      expect(processed.failed).toEqual([
        { key: 'PROJ-1', error: 'Not found' },
        { key: 'PROJ-2', error: 'Access denied' },
      ]);
    });

    it('должен обработать смешанные результаты', () => {
      const results: BatchResult<string, { key: string }> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: { key: 'PROJ-1' },
          index: 0,
        },
        {
          status: 'rejected',
          key: 'PROJ-2',
          reason: new Error('Not found'),
          index: 1,
        },
        {
          status: 'fulfilled',
          key: 'PROJ-3',
          value: { key: 'PROJ-3' },
          index: 2,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toHaveLength(2);
      expect(processed.failed).toHaveLength(1);
      expect(processed.successful[0]).toEqual({ key: 'PROJ-1', data: { key: 'PROJ-1' } });
      expect(processed.successful[1]).toEqual({ key: 'PROJ-3', data: { key: 'PROJ-3' } });
      expect(processed.failed[0]).toEqual({ key: 'PROJ-2', error: 'Not found' });
    });

    it('должен применить функцию фильтрации к успешным результатам', () => {
      const results: BatchResult<string, { key: string; summary: string; status: string }> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: { key: 'PROJ-1', summary: 'Task 1', status: 'open' },
          index: 0,
        },
        {
          status: 'fulfilled',
          key: 'PROJ-2',
          value: { key: 'PROJ-2', summary: 'Task 2', status: 'closed' },
          index: 1,
        },
      ];

      const filterFn = (item: { key: string; summary: string; status: string }) => ({
        key: item.key,
        summary: item.summary,
      });

      const processed = BatchResultProcessor.process(results, filterFn);

      expect(processed.successful).toEqual([
        { key: 'PROJ-1', data: { key: 'PROJ-1', summary: 'Task 1' } },
        { key: 'PROJ-2', data: { key: 'PROJ-2', summary: 'Task 2' } },
      ]);
    });

    it('должен обработать пустой value как ошибку', () => {
      const results: BatchResult<string, { key: string } | undefined> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: undefined,
          index: 0,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([]);
      expect(processed.failed).toEqual([
        { key: 'PROJ-1', error: 'Сущность не найдена (пустой результат)' },
      ]);
    });

    it('должен обработать null value как ошибку', () => {
      const results: BatchResult<string, { key: string } | null> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: null,
          index: 0,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([]);
      expect(processed.failed).toEqual([
        { key: 'PROJ-1', error: 'Сущность не найдена (пустой результат)' },
      ]);
    });

    it('должен преобразовать не-Error reason в строку', () => {
      const results: BatchResult<string, { key: string }> = [
        {
          status: 'rejected',
          key: 'PROJ-1',
          reason: 'String error' as unknown as Error,
          index: 0,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.failed).toEqual([{ key: 'PROJ-1', error: 'String error' }]);
    });

    it('должен обрабатывать большой объём данных', () => {
      const results: BatchResult<string, { key: string }> = Array.from({ length: 100 }, (_, i) => ({
        status: 'fulfilled' as const,
        key: `PROJ-${i + 1}`,
        value: { key: `PROJ-${i + 1}` },
        index: i,
      }));

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toHaveLength(100);
      expect(processed.failed).toHaveLength(0);
    });

    it('должен обрабатывать результаты с числовыми ключами', () => {
      const results: BatchResult<number, { id: number; name: string }> = [
        {
          status: 'fulfilled',
          key: 1,
          value: { id: 1, name: 'Item 1' },
          index: 0,
        },
        {
          status: 'rejected',
          key: 2,
          reason: new Error('Not found'),
          index: 1,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful).toEqual([{ key: 1, data: { id: 1, name: 'Item 1' } }]);
      expect(processed.failed).toEqual([{ key: 2, error: 'Not found' }]);
    });

    it('должен сохранять порядок результатов', () => {
      const results: BatchResult<string, { key: string; order: number }> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: { key: 'PROJ-1', order: 1 },
          index: 0,
        },
        {
          status: 'rejected',
          key: 'PROJ-2',
          reason: new Error('Error'),
          index: 1,
        },
        {
          status: 'fulfilled',
          key: 'PROJ-3',
          value: { key: 'PROJ-3', order: 3 },
          index: 2,
        },
      ];

      const processed = BatchResultProcessor.process(results);

      expect(processed.successful[0]?.data.order).toBe(1);
      expect(processed.successful[1]?.data.order).toBe(3);
    });

    it('должен применить фильтр только к успешным результатам', () => {
      const results: BatchResult<string, { key: string; value: number }> = [
        {
          status: 'fulfilled',
          key: 'PROJ-1',
          value: { key: 'PROJ-1', value: 100 },
          index: 0,
        },
        {
          status: 'rejected',
          key: 'PROJ-2',
          reason: new Error('Failed'),
          index: 1,
        },
        {
          status: 'fulfilled',
          key: 'PROJ-3',
          value: { key: 'PROJ-3', value: 200 },
          index: 2,
        },
      ];

      const filterFn = (item: { key: string; value: number }) => ({
        key: item.key,
        doubledValue: item.value * 2,
      });

      const processed = BatchResultProcessor.process(results, filterFn);

      expect(processed.successful).toEqual([
        { key: 'PROJ-1', data: { key: 'PROJ-1', doubledValue: 200 } },
        { key: 'PROJ-3', data: { key: 'PROJ-3', doubledValue: 400 } },
      ]);
      expect(processed.failed).toEqual([{ key: 'PROJ-2', error: 'Failed' }]);
    });
  });
});
