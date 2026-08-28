/**
 * Unit-тесты suggestDescriptionRewrite() (пакет 6.1 — пилот MCP Apps №1).
 */

import { describe, it, expect } from 'vitest';
import { suggestDescriptionRewrite } from '#tools/api/issues/analyze/suggest-description-rewrite.js';

describe('suggestDescriptionRewrite', () => {
  it('пустое описание → шаблон с разделами Контекст/Критерии приемки', () => {
    const { suggested, notes } = suggestDescriptionRewrite('');
    expect(suggested).toContain('## Контекст');
    expect(suggested).toContain('## Критерии приемки');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/пустое/i);
  });

  it('очень короткое описание → нота про длину, добавлены недостающие разделы', () => {
    const { suggested, notes } = suggestDescriptionRewrite('Починить баг');
    expect(notes.some((n) => /коротк/i.test(n))).toBe(true);
    expect(notes.some((n) => /раздел/i.test(n))).toBe(true);
    expect(suggested).toContain('Починить баг');
    expect(suggested).toContain('## Контекст');
    expect(suggested).toContain('## Критерии приемки');
  });

  it('описание уже содержит оба раздела и достаточно длинное → без изменений, нейтральная нота', () => {
    const complete =
      '## Контекст\nПользователи жалуются на медленную загрузку страницы профиля.\n\n' +
      '## Критерии приемки\nВремя загрузки < 1 секунды на тестовом стенде.';
    const { suggested, notes } = suggestDescriptionRewrite(complete);
    expect(suggested).toBe(complete);
    expect(notes).toEqual([
      'Явных структурных проблем не найдено — описание оставлено без изменений.',
    ]);
  });

  it('присутствует только один из двух разделов → достраивается недостающий', () => {
    const partial =
      '## Контекст\nНужно обновить зависимость.\n\nЭто длинный текст сверх минимальной длины проверки.';
    const { suggested, notes } = suggestDescriptionRewrite(partial);
    expect(suggested).toContain('## Критерии приемки');
    expect(suggested).not.toMatch(/## Контекст[\s\S]*## Контекст/);
    expect(notes.some((n) => n.includes('Критерии приемки'))).toBe(true);
  });

  it('не переформатирует исходный текст: правка = исходник плюс дописанные разделы', () => {
    const messy =
      'Текст один.\n\n\n\nТекст два, достаточно длинный для проверки минимальной длины.';
    const { suggested } = suggestDescriptionRewrite(messy);
    expect(suggested.startsWith(messy)).toBe(true);
  });

  it('разметка YFM доезжает до правки побайтово — иначе update_issue затрёт её в Трекере', () => {
    const yfm =
      '<{Детали реализации\nстрока 1\nстрока 2\n}>\nЕсли latency < 200 и rps > 1000 — ок.';
    const { suggested } = suggestDescriptionRewrite(yfm);
    expect(suggested).toContain('<{Детали реализации');
    expect(suggested).toContain('строка 1');
    expect(suggested).toContain('latency < 200 и rps > 1000');
  });

  it('хвостовые пробелы исходника остаются на месте — префикс побайтовый', () => {
    const trailing = 'Достаточно длинное описание задачи для анализа.   \n\t  ';
    const { suggested } = suggestDescriptionRewrite(trailing);
    expect(suggested.startsWith(trailing)).toBe(true);
  });

  it('текст со всеми разделами возвращается без единого изменения', () => {
    const complete = '## Контекст\nЗачем.\n\n## Критерии приемки\nЧто считать готовым.\n';
    const { suggested, notes } = suggestDescriptionRewrite(complete);
    expect(suggested).toBe(complete);
    expect(notes.some((n) => /без изменений/i.test(n))).toBe(true);
  });
});
