/**
 * DoD 1.1 п.4 плана plan_tool_contract_unification (ревизия 3, README §1.1):
 * `IssueKeySchema` принимает ключ (PROJ-123) ИЛИ внутренний id — строго
 * 24-символьный hex (живой замер: id задачи/чек-листа/changelog/bulk в
 * очереди TEST — все этой формы). Пустая строка и любая другая форма (в т.ч.
 * произвольная непустая строка вроде 'invalid-key') отвергаются.
 */

import { describe, it, expect } from 'vitest';
import { IssueKeySchema, IssueKeysSchema } from '#common/schemas/issue-key.schema.js';

describe('IssueKeySchema', () => {
  it('принимает ключ в формате очередь-номер', () => {
    expect(IssueKeySchema.safeParse('PROJ-123').success).toBe(true);
    expect(IssueKeySchema.safeParse('TEST-1').success).toBe(true);
  });

  it('принимает внутренний id — 24-символьный hex', () => {
    expect(IssueKeySchema.safeParse('6a86a4f94f009850c7186c67').success).toBe(true);
  });

  it('отвергает пустую строку', () => {
    expect(IssueKeySchema.safeParse('').success).toBe(false);
  });

  it('отвергает произвольную непустую строку, не подходящую ни под одну форму', () => {
    expect(IssueKeySchema.safeParse('invalid-key').success).toBe(false);
  });

  it('отвергает hex на 1 символ короче 24', () => {
    expect(IssueKeySchema.safeParse('6a86a4f94f009850c7186c6').success).toBe(false);
  });

  it('отвергает hex на 1 символ длиннее 24', () => {
    expect(IssueKeySchema.safeParse('6a86a4f94f009850c7186c677').success).toBe(false);
  });

  it('отвергает 24-символьную строку с недопустимым (не hex) символом', () => {
    expect(IssueKeySchema.safeParse('6a86a4f94f009850c7186c6g').success).toBe(false);
  });

  it('сообщение об ошибке называет обе ожидаемые формы (находка 4)', () => {
    const result = IssueKeySchema.safeParse('invalid-key');

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      expect(message).toContain('PROJ-123');
      expect(message).toContain('24');
    }
  });
});

describe('IssueKeysSchema', () => {
  it('принимает массив из ключей и внутренних id вперемешку', () => {
    const result = IssueKeysSchema.safeParse(['PROJ-1', '6a86a4f94f009850c7186c67']);

    expect(result.success).toBe(true);
  });

  it('требует минимум один элемент', () => {
    expect(IssueKeysSchema.safeParse([]).success).toBe(false);
  });

  it('отклоняет массив с пустой строкой среди элементов', () => {
    expect(IssueKeysSchema.safeParse(['PROJ-1', '']).success).toBe(false);
  });

  it('отклоняет массив с элементом, не подходящим ни под одну форму', () => {
    expect(IssueKeysSchema.safeParse(['PROJ-1', 'invalid-key']).success).toBe(false);
  });
});
