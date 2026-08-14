/**
 * Тесты вспомогательных схем `collection-response-mode.ts` (пакет 5.1.B
 * плана модернизации MCP 2026-07-28): `resolveCollectionResponseMode()` и
 * `collectionResponseModeParamSchema()` (порог обязан быть виден в тексте
 * описания параметра — граничное условие плана).
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COLLECTION_LINKS_THRESHOLD,
  resolveCollectionResponseMode,
  collectionResponseModeParamSchema,
} from '../../../../src/tools/common/collection-result/collection-response-mode.js';

describe('resolveCollectionResponseMode', () => {
  it('mode="links" всегда даёт links, даже для одного элемента', () => {
    expect(resolveCollectionResponseMode('links', 1)).toBe('links');
  });

  it('mode="full" всегда даёт full, даже для гигантской коллекции', () => {
    expect(resolveCollectionResponseMode('full', 100_000)).toBe('full');
  });

  it('mode="auto" даёт full ровно на границе порога (itemCount === threshold)', () => {
    expect(resolveCollectionResponseMode('auto', DEFAULT_COLLECTION_LINKS_THRESHOLD)).toBe('full');
  });

  it('mode="auto" даёт links сразу за порогом (itemCount === threshold + 1)', () => {
    expect(resolveCollectionResponseMode('auto', DEFAULT_COLLECTION_LINKS_THRESHOLD + 1)).toBe(
      'links'
    );
  });

  it('mode="auto" уважает явно переданный кастомный порог', () => {
    expect(resolveCollectionResponseMode('auto', 5, 3)).toBe('links');
    expect(resolveCollectionResponseMode('auto', 3, 3)).toBe('full');
  });
});

describe('collectionResponseModeParamSchema', () => {
  it('по умолчанию описывает порог DEFAULT_COLLECTION_LINKS_THRESHOLD в тексте', () => {
    const schema = collectionResponseModeParamSchema();
    expect(schema.description).toContain(String(DEFAULT_COLLECTION_LINKS_THRESHOLD));
  });

  it('кастомный threshold отражается в описании, а не значение по умолчанию', () => {
    const schema = collectionResponseModeParamSchema({ threshold: 7, itemsNoun: 'страниц' });
    expect(schema.description).toContain('7');
    expect(schema.description).toContain('страниц');
    expect(schema.description).not.toContain(String(DEFAULT_COLLECTION_LINKS_THRESHOLD));
  });

  it('парсит валидные значения enum и применяет default("auto")', () => {
    const schema = collectionResponseModeParamSchema();
    expect(schema.parse(undefined)).toBe('auto');
    expect(schema.parse('links')).toBe('links');
    expect(schema.parse('full')).toBe('full');
  });

  it('отклоняет значения вне enum', () => {
    const schema = collectionResponseModeParamSchema();
    expect(() => schema.parse('summary')).toThrow();
  });
});
