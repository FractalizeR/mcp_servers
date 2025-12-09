/**
 * Unit tests for field filtering utilities
 *
 * Tests field filtering with empty and non-empty field arrays
 */

import { describe, it, expect } from 'vitest';
import { filterFields, filterFieldsArray } from '#tools/shared/filter-fields.js';

describe('Field Filtering Utilities', () => {
  describe('filterFields', () => {
    const testObject = {
      id: '123',
      title: 'Test',
      content: 'Some content',
      priority: 5,
      status: 0,
    };

    it('should return all fields when fields array is empty', () => {
      const result = filterFields(testObject, []);

      expect(result).toEqual(testObject);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('status');
    });

    it('should filter to specified fields', () => {
      const result = filterFields(testObject, ['id', 'title']);

      expect(result).toHaveProperty('id', '123');
      expect(result).toHaveProperty('title', 'Test');
      expect(result).not.toHaveProperty('content');
      expect(result).not.toHaveProperty('priority');
      expect(result).not.toHaveProperty('status');
    });

    it('should filter to single field', () => {
      const result = filterFields(testObject, ['title']);

      expect(result).toEqual({ title: 'Test' });
    });

    it('should handle filtering with non-existent fields', () => {
      const result = filterFields(testObject, ['id', 'nonexistent', 'title']);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).not.toHaveProperty('nonexistent');
    });

    it('should handle nested objects', () => {
      const nested = {
        id: '1',
        user: { name: 'John', email: 'john@test.com' },
        status: 'active',
      };

      const result = filterFields(nested, ['id', 'user']);

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({ name: 'John', email: 'john@test.com' });
      expect(result).not.toHaveProperty('status');
    });
  });

  describe('filterFieldsArray', () => {
    const testArray = [
      { id: '1', title: 'Task 1', priority: 1, status: 0 },
      { id: '2', title: 'Task 2', priority: 3, status: 0 },
      { id: '3', title: 'Task 3', priority: 5, status: 1 },
    ];

    it('should return all items with all fields when fields array is empty', () => {
      const result = filterFieldsArray(testArray, []);

      expect(result).toEqual(testArray);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('priority');
      expect(result[0]).toHaveProperty('status');
    });

    it('should filter all items to specified fields', () => {
      const result = filterFieldsArray(testArray, ['id', 'title']);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '1', title: 'Task 1' });
      expect(result[1]).toEqual({ id: '2', title: 'Task 2' });
      expect(result[2]).toEqual({ id: '3', title: 'Task 3' });
    });

    it('should handle empty array', () => {
      const result = filterFieldsArray([], ['id', 'title']);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter to single field across all items', () => {
      const result = filterFieldsArray(testArray, ['title']);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ title: 'Task 1' });
      expect(result[1]).toEqual({ title: 'Task 2' });
      expect(result[2]).toEqual({ title: 'Task 3' });
    });

    it('should handle array with single item', () => {
      const singleItem = [{ id: '1', title: 'Task 1', priority: 1 }];
      const result = filterFieldsArray(singleItem, ['id', 'title']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', title: 'Task 1' });
    });

    it('should handle filtering with mixed existing and non-existing fields', () => {
      const result = filterFieldsArray(testArray, ['id', 'nonexistent']);

      expect(result).toHaveLength(3);
      result.forEach((item, index) => {
        expect(item).toHaveProperty('id', String(index + 1));
        expect(item).not.toHaveProperty('nonexistent');
      });
    });

    it('should preserve array order', () => {
      const result = filterFieldsArray(testArray, ['id']);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
    });

    it('should handle complex nested objects in array', () => {
      const complexArray = [
        { id: '1', meta: { created: '2024-01-01', updated: '2024-01-02' }, title: 'Task 1' },
        { id: '2', meta: { created: '2024-01-03', updated: '2024-01-04' }, title: 'Task 2' },
      ];

      const result = filterFieldsArray(complexArray, ['id', 'meta']);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('meta');
      expect(result[0].meta).toEqual({ created: '2024-01-01', updated: '2024-01-02' });
      expect(result[0]).not.toHaveProperty('title');
    });
  });
});
