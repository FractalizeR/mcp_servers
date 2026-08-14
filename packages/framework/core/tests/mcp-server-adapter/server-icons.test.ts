/**
 * Тесты для SERVER_ICONS (пакет 3.1.D плана модернизации MCP 2026-07-28).
 * Проверяют форму, требуемую планом: PNG обязателен (data: URI,
 * image/png), SVG рядом (data: URI, image/svg+xml, sizes: ['any']) —
 * без сети, без обращения к диску.
 */

import { describe, it, expect } from 'vitest';
import { SERVER_ICONS } from '../../src/mcp-server-adapter/server-icons.js';

describe('SERVER_ICONS', () => {
  it('содержит ровно две записи: PNG и SVG', () => {
    expect(SERVER_ICONS).toHaveLength(2);
  });

  it('несёт PNG-запись как data: URI с корректным mimeType и sizes', () => {
    const png = SERVER_ICONS.find((icon) => icon.mimeType === 'image/png');

    expect(png).toBeDefined();
    expect(png?.src.startsWith('data:image/png;base64,')).toBe(true);
    expect(png?.sizes).toEqual(['48x48']);
  });

  it('несёт SVG-запись как data: URI с sizes: ["any"]', () => {
    const svg = SERVER_ICONS.find((icon) => icon.mimeType === 'image/svg+xml');

    expect(svg).toBeDefined();
    expect(svg?.src.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(svg?.sizes).toEqual(['any']);
  });

  it('data: URI не пустые и декодируются как валидный base64', () => {
    for (const icon of SERVER_ICONS) {
      const base64 = icon.src.split('base64,')[1];
      expect(base64).toBeTruthy();
      expect(() => Buffer.from(base64 ?? '', 'base64')).not.toThrow();
      expect(Buffer.from(base64 ?? '', 'base64').length).toBeGreaterThan(0);
    }
  });
});
