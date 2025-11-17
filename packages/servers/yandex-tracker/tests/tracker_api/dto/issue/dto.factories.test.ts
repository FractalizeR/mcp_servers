/**
 * Тесты для DTO фабрик
 */

import { describe, expect, test } from 'vitest';
import {
  createMinimalCreateIssueDto,
  createFullCreateIssueDto,
  createUpdateIssueDto,
  createSearchIssuesDto,
  createFindIssuesByQuery,
  createFindIssuesByFilter,
  createFindIssuesByKeys,
  createFindIssuesByQueue,
  createExecuteTransitionDto,
  createEmptyExecuteTransitionDto,
} from '@tracker_api/dto/issue/dto.factories.js';

describe('DTO Factories', () => {
  describe('createMinimalCreateIssueDto', () => {
    test('создает минимальный валидный CreateIssueDto', () => {
      const dto = createMinimalCreateIssueDto();

      expect(dto).toEqual({
        queue: 'TEST',
        summary: 'Test issue',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createMinimalCreateIssueDto({
        queue: 'CUSTOM',
        summary: 'Custom summary',
      });

      expect(dto).toEqual({
        queue: 'CUSTOM',
        summary: 'Custom summary',
      });
    });

    test('поддерживает частичные overrides', () => {
      const dto = createMinimalCreateIssueDto({
        queue: 'CUSTOM',
      });

      expect(dto.queue).toBe('CUSTOM');
      expect(dto.summary).toBe('Test issue');
    });
  });

  describe('createFullCreateIssueDto', () => {
    test('создает полный CreateIssueDto со всеми полями', () => {
      const dto = createFullCreateIssueDto();

      expect(dto).toEqual({
        queue: 'TEST',
        summary: 'Test issue',
        description: 'Test description',
        assignee: 'testuser',
        priority: 'normal',
        type: 'task',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createFullCreateIssueDto({
        assignee: 'customuser',
        priority: 'critical',
      });

      expect(dto.assignee).toBe('customuser');
      expect(dto.priority).toBe('critical');
      expect(dto.queue).toBe('TEST');
    });
  });

  describe('createUpdateIssueDto', () => {
    test('создает валидный UpdateIssueDto', () => {
      const dto = createUpdateIssueDto();

      expect(dto).toEqual({
        summary: 'Updated summary',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createUpdateIssueDto({
        summary: 'Custom summary',
        description: 'Custom description',
      });

      expect(dto).toEqual({
        summary: 'Custom summary',
        description: 'Custom description',
      });
    });

    test('поддерживает множественные поля', () => {
      const dto = createUpdateIssueDto({
        assignee: 'newuser',
        priority: 'high',
        status: 'in_progress',
      });

      expect(dto).toMatchObject({
        summary: 'Updated summary',
        assignee: 'newuser',
        priority: 'high',
        status: 'in_progress',
      });
    });
  });

  describe('createSearchIssuesDto', () => {
    test('создает валидный SearchIssuesDto', () => {
      const dto = createSearchIssuesDto();

      expect(dto).toEqual({
        queue: 'TEST',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createSearchIssuesDto({
        queue: 'CUSTOM',
        status: 'open',
      });

      expect(dto).toMatchObject({
        queue: 'CUSTOM',
        status: 'open',
      });
    });
  });

  describe('createFindIssuesByQuery', () => {
    test('создает FindIssuesInputDto с query', () => {
      const dto = createFindIssuesByQuery('Assignee: me()');

      expect(dto).toEqual({
        query: 'Assignee: me()',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createFindIssuesByQuery('Assignee: me()', {
        perPage: 100,
        order: ['+created'],
      });

      expect(dto).toMatchObject({
        query: 'Assignee: me()',
        perPage: 100,
        order: ['+created'],
      });
    });
  });

  describe('createFindIssuesByFilter', () => {
    test('создает FindIssuesInputDto с filter', () => {
      const filter = { queue: 'TEST', status: 'open' };
      const dto = createFindIssuesByFilter(filter);

      expect(dto).toEqual({
        filter,
      });
    });

    test('поддерживает overrides', () => {
      const filter = { queue: 'TEST' };
      const dto = createFindIssuesByFilter(filter, {
        perPage: 50,
      });

      expect(dto).toMatchObject({
        filter,
        perPage: 50,
      });
    });
  });

  describe('createFindIssuesByKeys', () => {
    test('создает FindIssuesInputDto с keys', () => {
      const keys = ['TEST-1', 'TEST-2'];
      const dto = createFindIssuesByKeys(keys);

      expect(dto).toEqual({
        keys,
      });
    });

    test('поддерживает overrides', () => {
      const keys = ['TEST-1'];
      const dto = createFindIssuesByKeys(keys, {
        expand: ['transitions'],
      });

      expect(dto).toMatchObject({
        keys,
        expand: ['transitions'],
      });
    });
  });

  describe('createFindIssuesByQueue', () => {
    test('создает FindIssuesInputDto с queue', () => {
      const dto = createFindIssuesByQueue('DEVOPS');

      expect(dto).toEqual({
        queue: 'DEVOPS',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createFindIssuesByQueue('DEVOPS', {
        page: 2,
        perPage: 25,
      });

      expect(dto).toMatchObject({
        queue: 'DEVOPS',
        page: 2,
        perPage: 25,
      });
    });
  });

  describe('createExecuteTransitionDto', () => {
    test('создает валидный ExecuteTransitionDto', () => {
      const dto = createExecuteTransitionDto();

      expect(dto).toEqual({
        comment: 'Transition comment',
      });
    });

    test('поддерживает overrides', () => {
      const dto = createExecuteTransitionDto({
        comment: 'Custom comment',
      });

      expect(dto).toEqual({
        comment: 'Custom comment',
      });
    });

    test('поддерживает дополнительные поля', () => {
      const dto = createExecuteTransitionDto({
        customField: 'customValue',
      });

      expect(dto).toMatchObject({
        comment: 'Transition comment',
        customField: 'customValue',
      });
    });
  });

  describe('createEmptyExecuteTransitionDto', () => {
    test('создает пустой ExecuteTransitionDto', () => {
      const dto = createEmptyExecuteTransitionDto();

      expect(dto).toEqual({});
    });

    test('возвращает новый объект при каждом вызове', () => {
      const dto1 = createEmptyExecuteTransitionDto();
      const dto2 = createEmptyExecuteTransitionDto();

      expect(dto1).not.toBe(dto2);
    });
  });
});
