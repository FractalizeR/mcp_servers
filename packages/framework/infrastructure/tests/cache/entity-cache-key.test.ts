/**
 * Тесты для EntityCacheKey
 */

import { describe, it, expect } from 'vitest';
import {
  EntityCacheKey,
  EntityType,
} from '@mcp-framework/infrastructure/cache/entity-cache-key.js';

describe('EntityCacheKey', () => {
  describe('createKey', () => {
    it('должен создать ключ для задачи', () => {
      const key = EntityCacheKey.createKey(EntityType.ISSUE, 'QUEUE-123');

      expect(key).toBe('issue:QUEUE-123');
    });

    it('должен создать ключ для очереди', () => {
      const key = EntityCacheKey.createKey(EntityType.QUEUE, 'PROJ');

      expect(key).toBe('queue:PROJ');
    });

    it('должен создать ключ для пользователя', () => {
      const key = EntityCacheKey.createKey(EntityType.USER, 'user123');

      expect(key).toBe('user:user123');
    });

    it('должен создать ключ для комментария', () => {
      const key = EntityCacheKey.createKey(EntityType.COMMENT, 'comment-456');

      expect(key).toBe('comment:comment-456');
    });

    it('должен создать ключ для спринта', () => {
      const key = EntityCacheKey.createKey(EntityType.SPRINT, 'sprint-789');

      expect(key).toBe('sprint:sprint-789');
    });

    it('должен создать ключ для проекта', () => {
      const key = EntityCacheKey.createKey(EntityType.PROJECT, 'project-001');

      expect(key).toBe('project:project-001');
    });

    it('должен обрабатывать идентификаторы с специальными символами', () => {
      const key = EntityCacheKey.createKey(EntityType.ISSUE, 'QUEUE-123:456');

      expect(key).toBe('issue:QUEUE-123:456');
    });

    it('должен обрабатывать пустой идентификатор', () => {
      const key = EntityCacheKey.createKey(EntityType.ISSUE, '');

      expect(key).toBe('issue:');
    });

    it('должен обрабатывать идентификаторы с пробелами', () => {
      const key = EntityCacheKey.createKey(EntityType.USER, 'user with spaces');

      expect(key).toBe('user:user with spaces');
    });

    it('должен различать разные типы с одинаковыми ID', () => {
      const issueKey = EntityCacheKey.createKey(EntityType.ISSUE, '123');
      const queueKey = EntityCacheKey.createKey(EntityType.QUEUE, '123');

      expect(issueKey).not.toBe(queueKey);
      expect(issueKey).toBe('issue:123');
      expect(queueKey).toBe('queue:123');
    });
  });

  describe('EntityType enum', () => {
    it('должен содержать все типы сущностей', () => {
      expect(EntityType.ISSUE).toBe('issue');
      expect(EntityType.QUEUE).toBe('queue');
      expect(EntityType.USER).toBe('user');
      expect(EntityType.COMMENT).toBe('comment');
      expect(EntityType.COMPONENT).toBe('component');
      expect(EntityType.SPRINT).toBe('sprint');
      expect(EntityType.BOARD).toBe('board');
      expect(EntityType.PROJECT).toBe('project');
      expect(EntityType.ATTACHMENT).toBe('attachment');
      expect(EntityType.FIELD).toBe('field');
    });

    it('должен иметь 10 типов сущностей', () => {
      const types = Object.values(EntityType);
      expect(types).toHaveLength(10);
    });
  });
});
