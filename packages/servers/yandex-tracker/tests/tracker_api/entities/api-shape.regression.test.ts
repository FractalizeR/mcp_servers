/**
 * Регрессия на форму сущностей, снятую с боевого API 2026-08-19.
 *
 * Держит расхождение, из-за которого `issue.createdBy.login` проходил typecheck и
 * возвращал `undefined` в проде. Защита двухслойная и это существенно: утверждения
 * о типах падают на `typecheck:tests` (именно они ловят возврат `User` в `Issue`),
 * а runtime-проверки ловят расхождение фикстур с типами.
 */

import { describe, expect, test } from 'vitest';
import {
  createFullIssue,
  createMinimalChangelogEntry,
  createQueue,
} from '#tracker_api/entities/entity.factories.js';
import type { Issue } from '#tracker_api/entities/issue.entity.js';
import type { ChangelogEntry } from '#tracker_api/entities/changelog.entity.js';
import type { Queue } from '#tracker_api/entities/queue.entity.js';
import type { Component } from '#tracker_api/entities/component.entity.js';
import type { UserRef, QueueRef } from '#tracker_api/entities/common/index.js';
import { createIssueFixture } from '#helpers/issue.fixture.js';

/** Утверждение о типах: компилируется только если `T` в точности равен `U`. */
type Exact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
function expectType<T extends true>(_assertion: T): void {
  // Проверка выполняется компилятором; в рантайме делать нечего.
}

describe('форма сущностей соответствует ответам API (типы)', () => {
  test('вложенные пользователи и очередь задачи — ref-ы', () => {
    expectType<Exact<Issue['createdBy'], UserRef>>(true);
    expectType<Exact<NonNullable<Issue['assignee']>, UserRef>>(true);
    expectType<Exact<Issue['queue'], QueueRef>>(true);
    expectType<Exact<ChangelogEntry['updatedBy'], UserRef>>(true);
  });

  test('id полной сущности — число, id ref-а — строка', () => {
    expectType<Exact<Queue['id'], number>>(true);
    expectType<Exact<Component['id'], number>>(true);
    expectType<Exact<QueueRef['id'], string>>(true);
    expectType<Exact<UserRef['id'], string>>(true);
  });
});

describe('форма сущностей соответствует ответам API (значения фикстур)', () => {
  const USER_ONLY_FIELDS = ['uid', 'login', 'email', 'dismissed'] as const;
  const QUEUE_ONLY_FIELDS = ['version', 'name', 'lead', 'defaultType'] as const;

  test('фабрика задачи отдаёт ref-ы, а не полные сущности', () => {
    const issue = createFullIssue();

    for (const user of [issue.createdBy, issue.assignee]) {
      expect(Object.keys(user ?? {})).toEqual(['self', 'id', 'display']);
      for (const field of USER_ONLY_FIELDS) {
        expect(user).not.toHaveProperty(field);
      }
    }

    expect(Object.keys(issue.queue)).toEqual(['self', 'id', 'key', 'display']);
    for (const field of QUEUE_ONLY_FIELDS) {
      expect(issue.queue).not.toHaveProperty(field);
    }
  });

  test('автор изменения в changelog — ref', () => {
    expect(Object.keys(createMinimalChangelogEntry().updatedBy)).toEqual(['self', 'id', 'display']);
  });

  test('фикстура задачи повторяет форму фабрики', () => {
    const issue = createIssueFixture();

    expect(Object.keys(issue.createdBy)).toEqual(['self', 'id', 'display']);
    expect(Object.keys(issue.queue)).toEqual(['self', 'id', 'key', 'display']);
  });

  test('автор и исполнитель различаются идентификатором, а не только именем', () => {
    const issue = createFullIssue();

    expect(issue.assignee?.id).not.toBe(issue.createdBy.id);
    expect(issue.assignee?.self).not.toBe(issue.createdBy.self);
  });

  test('id ref-а — строка, id полной очереди — число', () => {
    expect(typeof createFullIssue().queue.id).toBe('string');
    expect(typeof createQueue().id).toBe('number');
  });
});
