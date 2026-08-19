import { describe, it, expect } from 'vitest';
import { buildChecklistItemBody } from '#tracker_api/api_operations/checklist/checklist-item-body.util.js';

describe('buildChecklistItemBody', () => {
  it('оборачивает deadline-дату (YYYY-MM-DD) в {date, deadlineType}', () => {
    const body = buildChecklistItemBody({ text: 'Item', deadline: '2026-08-25' });
    expect(body['deadline']).toEqual({ date: '2026-08-25', deadlineType: 'date' });
  });

  it('оборачивает deadline полным ISO 8601, не переформатируя дату', () => {
    const body = buildChecklistItemBody({
      text: 'Item',
      deadline: '2026-08-25T00:00:00.000+0000',
    });
    expect(body['deadline']).toEqual({
      date: '2026-08-25T00:00:00.000+0000',
      deadlineType: 'date',
    });
  });

  it('не добавляет ключ deadline, если он не передан (не null, не пустой объект)', () => {
    const body = buildChecklistItemBody({ text: 'Item' });
    expect(body).not.toHaveProperty('deadline');
    expect(body).toEqual({ text: 'Item' });
  });

  it('прокидывает text/checked/assignee как есть', () => {
    const body = buildChecklistItemBody({
      text: 'Item',
      checked: true,
      assignee: 'user123',
    });
    expect(body).toEqual({ text: 'Item', checked: true, assignee: 'user123' });
  });

  it('строит пустое тело при полностью пустом partial update', () => {
    const body = buildChecklistItemBody({});
    expect(body).toEqual({});
  });
});
