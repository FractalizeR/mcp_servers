import { describe, it, expect } from 'vitest';
import { ItemBudget, DEFAULT_MAX_TOTAL_ITEMS } from '#tracker_api/utils/item-budget.util.js';

describe('ItemBudget', () => {
  it('хранит начальный остаток', () => {
    expect(new ItemBudget(100).remaining).toBe(100);
  });

  it('consume уменьшает остаток', () => {
    const budget = new ItemBudget(10);
    budget.consume(4);
    expect(budget.remaining).toBe(6);
  });

  it('не уходит ниже нуля', () => {
    const budget = new ItemBudget(3);
    budget.consume(5);
    expect(budget.remaining).toBe(0);
  });

  it('отрицательный total нормализуется к нулю', () => {
    expect(new ItemBudget(-5).remaining).toBe(0);
  });

  it('дефолтный потолок = 1000', () => {
    expect(DEFAULT_MAX_TOTAL_ITEMS).toBe(1000);
  });
});
