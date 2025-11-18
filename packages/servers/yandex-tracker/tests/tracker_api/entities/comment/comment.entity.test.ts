/**
 * Тесты для Comment entity
 */

import { describe, expect, test } from 'vitest';
import type { Comment, CommentWithUnknownFields } from '@tracker_api/entities/comment/index.js';
import type { WithUnknownFields } from '@tracker_api/entities/types.js';

describe('Comment Entity', () => {
  describe('Type structure', () => {
    test('Comment имеет все обязательные поля', () => {
      const comment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
      };

      // Проверяем, что обязательные поля присутствуют
      expect(comment.id).toBeDefined();
      expect(comment.self).toBeDefined();
      expect(comment.text).toBeDefined();
      expect(comment.createdBy).toBeDefined();
      expect(comment.createdAt).toBeDefined();
    });

    test('Comment поддерживает опциональные поля', () => {
      const comment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        updatedBy: {
          self: 'https://api.tracker.yandex.net/v3/users/2',
          id: '2',
          display: 'Updater User',
        },
        updatedAt: '2025-01-18T11:00:00.000+0000',
        version: 2,
        transport: 'internal',
        attachments: [
          {
            id: 'att-1',
            name: 'file.txt',
            size: 1024,
          },
        ],
      };

      // Проверяем, что опциональные поля присутствуют
      expect(comment.updatedBy).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
      expect(comment.version).toBe(2);
      expect(comment.transport).toBe('internal');
      expect(comment.attachments).toHaveLength(1);
    });

    test('CommentWithUnknownFields соответствует WithUnknownFields<Comment>', () => {
      const comment: CommentWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        unknownField: 'some value',
      };

      // Проверяем, что можем присвоить к базовому типу с WithUnknownFields
      const asWithUnknown: WithUnknownFields<Comment> = comment;
      expect(asWithUnknown.id).toBe('123');
    });

    test('Comment.transport поддерживает только valid значения', () => {
      const internalComment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        transport: 'internal',
      };

      const emailComment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        transport: 'email',
      };

      expect(internalComment.transport).toBe('internal');
      expect(emailComment.transport).toBe('email');
    });

    test('CommentAttachment имеет все обязательные поля', () => {
      const comment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        attachments: [
          {
            id: 'att-1',
            name: 'document.pdf',
            size: 2048,
          },
        ],
      };

      const attachment = comment.attachments?.[0];
      expect(attachment?.id).toBeDefined();
      expect(attachment?.name).toBeDefined();
      expect(attachment?.size).toBeDefined();
    });
  });

  describe('Immutability', () => {
    test('Comment поля объявлены как readonly', () => {
      // Тест проверяет, что TypeScript компилятор запрещает изменение readonly полей
      // Runtime проверка не нужна, так как readonly - это compile-time feature
      const comment: Comment = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/comments/123',
        text: 'Test comment',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v3/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
      };

      // TypeScript должен запретить изменение полей (compile-time check)
      // @ts-expect-error - readonly field
      comment.id = 'new-id';

      // @ts-expect-error - readonly field
      comment.text = 'new text';

      // Если TypeScript компилируется без ошибок, значит тест passed
      expect(comment).toBeDefined();
    });
  });
});
