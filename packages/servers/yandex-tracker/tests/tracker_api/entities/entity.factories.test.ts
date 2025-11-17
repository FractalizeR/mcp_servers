/**
 * Тесты для Entity фабрик
 */

import { describe, expect, test } from 'vitest';
import {
  createUser,
  createMinimalUser,
  createQueue,
  createStatus,
  createPriority,
  createIssueType,
  createMinimalIssue,
  createFullIssue,
  createSimpleTransition,
  createTransitionWithScreen,
  createChangelogField,
  createMinimalChangelogEntry,
  createFullChangelogEntry,
} from '@tracker_api/entities/entity.factories.js';

describe('Entity Factories', () => {
  describe('createUser', () => {
    test('создает валидный User entity', () => {
      const user = createUser();

      expect(user).toMatchObject({
        uid: '1234567890',
        display: 'Test User',
        login: 'testuser',
        isActive: true,
        email: 'testuser@example.com',
      });
    });

    test('поддерживает overrides', () => {
      const user = createUser({
        login: 'customuser',
        email: 'custom@example.com',
      });

      expect(user.login).toBe('customuser');
      expect(user.email).toBe('custom@example.com');
      expect(user.uid).toBe('1234567890');
    });
  });

  describe('createMinimalUser', () => {
    test('создает минимальный User entity без опциональных полей', () => {
      const user = createMinimalUser();

      expect(user).toEqual({
        uid: '1234567890',
        display: 'Test User',
        login: 'testuser',
        isActive: true,
      });
      expect(user.email).toBeUndefined();
      expect(user.firstName).toBeUndefined();
      expect(user.lastName).toBeUndefined();
    });

    test('поддерживает overrides', () => {
      const user = createMinimalUser({
        isActive: false,
      });

      expect(user.isActive).toBe(false);
    });
  });

  describe('createQueue', () => {
    test('создает валидный Queue entity', () => {
      const queue = createQueue();

      expect(queue).toEqual({
        id: '1',
        key: 'TEST',
        name: 'Test Queue',
      });
    });

    test('поддерживает overrides', () => {
      const queue = createQueue({
        key: 'DEVOPS',
        name: 'DevOps Queue',
      });

      expect(queue.key).toBe('DEVOPS');
      expect(queue.name).toBe('DevOps Queue');
    });
  });

  describe('createStatus', () => {
    test('создает валидный Status entity', () => {
      const status = createStatus();

      expect(status).toEqual({
        id: '1',
        key: 'open',
        display: 'Open',
      });
    });

    test('поддерживает overrides', () => {
      const status = createStatus({
        key: 'closed',
        display: 'Closed',
      });

      expect(status.key).toBe('closed');
      expect(status.display).toBe('Closed');
    });
  });

  describe('createPriority', () => {
    test('создает валидный Priority entity', () => {
      const priority = createPriority();

      expect(priority).toEqual({
        id: '1',
        key: 'normal',
        display: 'Normal',
      });
    });

    test('поддерживает overrides', () => {
      const priority = createPriority({
        key: 'critical',
        display: 'Critical',
      });

      expect(priority.key).toBe('critical');
      expect(priority.display).toBe('Critical');
    });
  });

  describe('createIssueType', () => {
    test('создает валидный IssueType entity', () => {
      const type = createIssueType();

      expect(type).toEqual({
        id: '1',
        key: 'task',
        display: 'Task',
      });
    });

    test('поддерживает overrides', () => {
      const type = createIssueType({
        key: 'bug',
        display: 'Bug',
      });

      expect(type.key).toBe('bug');
      expect(type.display).toBe('Bug');
    });
  });

  describe('createMinimalIssue', () => {
    test('создает минимальный Issue entity с обязательными полями', () => {
      const issue = createMinimalIssue();

      expect(issue).toMatchObject({
        id: '1',
        key: 'TEST-1',
        summary: 'Test issue',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(issue.queue).toBeDefined();
      expect(issue.status).toBeDefined();
      expect(issue.createdBy).toBeDefined();
      expect(issue.description).toBeUndefined();
      expect(issue.assignee).toBeUndefined();
      expect(issue.priority).toBeUndefined();
      expect(issue.type).toBeUndefined();
    });

    test('поддерживает overrides', () => {
      const issue = createMinimalIssue({
        key: 'CUSTOM-123',
        summary: 'Custom issue',
      });

      expect(issue.key).toBe('CUSTOM-123');
      expect(issue.summary).toBe('Custom issue');
    });
  });

  describe('createFullIssue', () => {
    test('создает полный Issue entity со всеми полями', () => {
      const issue = createFullIssue();

      expect(issue).toMatchObject({
        id: '1',
        key: 'TEST-1',
        summary: 'Test issue',
        description: 'Test description',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(issue.queue).toBeDefined();
      expect(issue.status).toBeDefined();
      expect(issue.createdBy).toBeDefined();
      expect(issue.assignee).toBeDefined();
      expect(issue.priority).toBeDefined();
      expect(issue.type).toBeDefined();
    });

    test('assignee отличается от createdBy', () => {
      const issue = createFullIssue();

      expect(issue.assignee?.login).toBe('assignee');
      expect(issue.createdBy.login).toBe('testuser');
    });

    test('поддерживает overrides', () => {
      const issue = createFullIssue({
        description: 'Custom description',
      });

      expect(issue.description).toBe('Custom description');
    });
  });

  describe('createSimpleTransition', () => {
    test('создает валидный Transition без screen', () => {
      const transition = createSimpleTransition();

      expect(transition).toMatchObject({
        id: '1',
        self: 'https://tracker.yandex.ru/v3/issues/TEST-1/transitions/1',
      });
      expect(transition.to).toMatchObject({
        key: 'in_progress',
        display: 'In Progress',
      });
      expect(transition.screen).toBeUndefined();
    });

    test('поддерживает overrides', () => {
      const transition = createSimpleTransition({
        id: '2',
      });

      expect(transition.id).toBe('2');
    });
  });

  describe('createTransitionWithScreen', () => {
    test('создает валидный Transition с screen', () => {
      const transition = createTransitionWithScreen();

      expect(transition).toMatchObject({
        id: '1',
        self: 'https://tracker.yandex.ru/v3/issues/TEST-1/transitions/1',
      });
      expect(transition.to).toMatchObject({
        key: 'resolved',
        display: 'Resolved',
      });
      expect(transition.screen).toEqual({
        id: 'screen-1',
        self: 'https://tracker.yandex.ru/v3/screens/screen-1',
      });
    });

    test('поддерживает overrides', () => {
      const transition = createTransitionWithScreen({
        id: '3',
      });

      expect(transition.id).toBe('3');
      expect(transition.screen).toBeDefined();
    });
  });

  describe('createChangelogField', () => {
    test('создает валидный ChangelogField', () => {
      const field = createChangelogField();

      expect(field).toEqual({
        field: {
          id: 'status',
          display: 'Status',
        },
        from: { key: 'open', display: 'Open' },
        to: { key: 'in_progress', display: 'In Progress' },
      });
    });

    test('поддерживает overrides', () => {
      const field = createChangelogField({
        field: {
          id: 'priority',
          display: 'Priority',
        },
      });

      expect(field.field.id).toBe('priority');
    });
  });

  describe('createMinimalChangelogEntry', () => {
    test('создает минимальный ChangelogEntry с обязательными полями', () => {
      const entry = createMinimalChangelogEntry();

      expect(entry).toMatchObject({
        id: '1',
        self: 'https://tracker.yandex.ru/v3/issues/TEST-1/changelog/1',
        issue: {
          id: '1',
          key: 'TEST-1',
          display: 'Test issue',
        },
        updatedAt: '2024-01-01T00:00:00.000Z',
        type: 'IssueUpdated',
      });
      expect(entry.updatedBy).toBeDefined();
      expect(entry.transport).toBeUndefined();
      expect(entry.fields).toBeUndefined();
    });

    test('поддерживает overrides', () => {
      const entry = createMinimalChangelogEntry({
        type: 'IssueCreated',
      });

      expect(entry.type).toBe('IssueCreated');
    });
  });

  describe('createFullChangelogEntry', () => {
    test('создает полный ChangelogEntry с полями изменений', () => {
      const entry = createFullChangelogEntry();

      expect(entry).toMatchObject({
        id: '1',
        self: 'https://tracker.yandex.ru/v3/issues/TEST-1/changelog/1',
        issue: {
          id: '1',
          key: 'TEST-1',
          display: 'Test issue',
        },
        updatedAt: '2024-01-01T00:00:00.000Z',
        type: 'IssueUpdated',
        transport: 'web',
      });
      expect(entry.updatedBy).toBeDefined();
      expect(entry.fields).toBeDefined();
      expect(entry.fields).toHaveLength(1);
    });

    test('поддерживает overrides', () => {
      const entry = createFullChangelogEntry({
        transport: 'api',
      });

      expect(entry.transport).toBe('api');
    });
  });
});
