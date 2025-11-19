// tests/e2e/helpers/assertion-helpers.ts
import { expect } from 'vitest';

/**
 * Проверить что объект имеет указанные поля
 * @param obj - Объект для проверки
 * @param expectedFields - Массив ожидаемых полей
 */
export function assertHasFields(obj: unknown, expectedFields: readonly string[] | string[]): void {
  for (const field of expectedFields) {
    expect(obj).toHaveProperty(field);
  }
}

/**
 * Проверить что задача имеет базовую структуру
 * @param issue - Задача для проверки
 * @param requestedFields - Опциональный массив запрошенных полей
 */
export function assertIssueStructure(issue: unknown, requestedFields?: readonly string[] | string[]): void {
  if (!requestedFields) {
    // Дефолтная проверка для обратной совместимости
    expect(issue).toHaveProperty('key');
    expect(issue).toHaveProperty('summary');
    expect(issue).toHaveProperty('status');
    expect(issue).toHaveProperty('queue');
  } else {
    // Гибкая проверка только запрошенных полей
    assertHasFields(issue, requestedFields);
  }
}

/**
 * Проверить что задача имеет ожидаемый статус
 */
export function assertIssueStatus(issue: unknown, expectedStatus: string): void {
  expect(issue).toHaveProperty('status');
  expect((issue as { status: { key: string } }).status).toHaveProperty('key');
  expect((issue as { status: { key: string } }).status.key).toBe(expectedStatus);
}

/**
 * Проверить что массив содержит задачи с ожидаемыми ключами
 */
export function assertIssuesContainKeys(issues: unknown[], expectedKeys: string[]): void {
  expect(Array.isArray(issues)).toBe(true);
  const issueKeys = (issues as { key: string }[]).map((issue) => issue.key);
  for (const expectedKey of expectedKeys) {
    expect(issueKeys).toContain(expectedKey);
  }
}

/**
 * Проверить что changelog содержит изменения
 * @param changelog - Массив записей changelog
 * @param requestedFields - Опциональный массив запрошенных полей
 */
export function assertChangelogStructure(
  changelog: unknown[],
  requestedFields?: readonly string[] | string[]
): void {
  expect(Array.isArray(changelog)).toBe(true);
  if (changelog.length > 0) {
    const entry = changelog[0] as Record<string, unknown>;
    if (requestedFields) {
      assertHasFields(entry, requestedFields);
    } else {
      // Дефолт для обратной совместимости
      expect(entry).toHaveProperty('updatedAt');
      expect(entry).toHaveProperty('updatedBy');
    }
  }
}

/**
 * Проверить что transitions имеют правильную структуру
 * @param transitions - Массив transitions
 * @param requestedFields - Опциональный массив запрошенных полей
 */
export function assertTransitionsStructure(
  transitions: unknown[],
  requestedFields?: readonly string[] | string[]
): void {
  expect(Array.isArray(transitions)).toBe(true);
  if (transitions.length > 0) {
    const transition = transitions[0] as Record<string, unknown>;
    if (requestedFields) {
      assertHasFields(transition, requestedFields);
    } else {
      // Дефолт для обратной совместимости
      expect(transition).toHaveProperty('id');
      expect(transition).toHaveProperty('to');
    }
  }
}
