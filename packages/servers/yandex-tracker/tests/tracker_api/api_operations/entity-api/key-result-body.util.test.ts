import { describe, it, expect } from 'vitest';
import { buildKeyResultItemBody } from '#tracker_api/api_operations/entity-api/key-result-body.util.js';

describe('buildKeyResultItemBody', () => {
  it('строит минимальное тело (только type+text)', () => {
    const body = buildKeyResultItemBody({ type: 'binary', text: 'Ship feature X' });
    expect(body).toEqual({ type: 'binary', text: 'Ship feature X' });
  });

  it('оборачивает deadline (строка YYYY-MM-DD) в {date, deadlineType}', () => {
    const body = buildKeyResultItemBody({
      type: 'binary',
      text: 'Ship X',
      deadline: '2026-12-31',
    });
    expect(body['deadline']).toEqual({ date: '2026-12-31', deadlineType: 'date' });
  });

  it('прокидывает progress и achieved как есть', () => {
    const body = buildKeyResultItemBody({
      type: 'value',
      text: 'Grow MRR',
      progress: { start: 0, end: 100, current: 25 },
      achieved: false,
    });
    expect(body['progress']).toEqual({ start: 0, end: 100, current: 25 });
    expect(body['achieved']).toBe(false);
  });

  it('прокидывает assignee как login-строку', () => {
    const body = buildKeyResultItemBody({ type: 'binary', text: 'X', assignee: 'ivanov' });
    expect(body['assignee']).toBe('ivanov');
  });

  it('не добавляет опциональные поля, если они не переданы', () => {
    const body = buildKeyResultItemBody({ type: 'binary', text: 'X' });
    expect(body).not.toHaveProperty('assignee');
    expect(body).not.toHaveProperty('deadline');
    expect(body).not.toHaveProperty('progress');
    expect(body).not.toHaveProperty('achieved');
  });
});
