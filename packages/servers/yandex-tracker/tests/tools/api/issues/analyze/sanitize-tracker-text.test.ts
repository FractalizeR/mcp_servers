/**
 * Unit-тесты sanitizeTrackerText() (пакет 6.1 — пилот MCP Apps №1).
 *
 * Требование безопасности плана: «содержимое описания приходит из Трекера и
 * для рендера недоверенное — санитайз обязателен». Тесты ниже — тот самый
 * обязательный «тест с описанием, содержащим разметку и скрипт» из DoD.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeTrackerText } from '#tools/api/issues/analyze/sanitize-tracker-text.js';

describe('sanitizeTrackerText', () => {
  it('вырезает <script>...</script> целиком, включая содержимое', () => {
    const input = 'Привет<script>alert(document.cookie)</script>, мир';
    expect(sanitizeTrackerText(input)).toBe('Привет, мир');
  });

  it('вырезает тег с обработчиком события (onerror) и не оставляет атрибуты', () => {
    const input = 'До<img src="x" onerror="alert(1)">После';
    const result = sanitizeTrackerText(input);
    expect(result).toBe('ДоПосле');
    expect(result).not.toContain('onerror');
    expect(result).not.toMatch(/[<>]/);
  });

  it('вырезает <style>...</style> целиком', () => {
    const input = 'Текст<style>body{display:none}</style>ещё текст';
    expect(sanitizeTrackerText(input)).toBe('Текстещё текст');
  });

  it('вырезает произвольные HTML-теги без атаки (например, вставленный <b>)', () => {
    expect(sanitizeTrackerText('Просто <b>жирный</b> текст')).toBe('Просто жирный текст');
  });

  it('не трогает легитимную YFM-разметку (не HTML)', () => {
    const yfm = '## Заголовок\n\n**жирный** и _курсив_, список:\n- один\n- два';
    expect(sanitizeTrackerText(yfm)).toBe(yfm);
  });

  it('нормализует переводы строк CRLF → LF и обрезает края', () => {
    expect(sanitizeTrackerText('  \r\nтекст\r\n  ')).toBe('текст');
  });

  it('пустая строка на входе даёт пустую строку на выходе', () => {
    expect(sanitizeTrackerText('')).toBe('');
  });

  it('на выходе гарантированно нет символов < и > при любой комбинации атак', () => {
    const input =
      '<svg onload=alert(1)><script>fetch("//evil")</script><a href="javascript:alert(1)">клик</a>';
    const result = sanitizeTrackerText(input);
    expect(result).not.toMatch(/[<>]/);
  });
});
