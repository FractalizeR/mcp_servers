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

// NOTE: Остальные assertions будут добавлены в Фазе 2
