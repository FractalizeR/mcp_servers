// tests/e2e/helpers/assertion-helpers.ts
import { expect } from 'vitest';

/**
 * Проверить что задача имеет базовую структуру
 */
export function assertIssueStructure(issue: unknown): void {
  expect(issue).toHaveProperty('key');
  expect(issue).toHaveProperty('summary');
  expect(issue).toHaveProperty('status');
  expect(issue).toHaveProperty('queue');
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
 */
export function assertChangelogStructure(changelog: unknown[]): void {
  expect(Array.isArray(changelog)).toBe(true);
  if (changelog.length > 0) {
    const entry = changelog[0] as Record<string, unknown>;
    expect(entry).toHaveProperty('updatedAt');
    expect(entry).toHaveProperty('updatedBy');
  }
}

/**
 * Проверить что transitions имеют правильную структуру
 */
export function assertTransitionsStructure(transitions: unknown[]): void {
  expect(Array.isArray(transitions)).toBe(true);
  if (transitions.length > 0) {
    const transition = transitions[0] as Record<string, unknown>;
    expect(transition).toHaveProperty('id');
    expect(transition).toHaveProperty('to');
  }
}
