/**
 * Тесты `buildCollectionOutputSchema()` (пакет 5.1.B плана модернизации
 * MCP 2026-07-28) — outputSchema инструмента-коллекции согласован с
 * `formatSuccess`/`buildOutputSchema` (единый success envelope
 * `{ success: true, data }`).
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildCollectionOutputSchema } from '../../../../src/tools/common/collection-result/collection-output-schema.js';

const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
});

describe('buildCollectionOutputSchema', () => {
  it('оборачивает data в success envelope, как buildOutputSchema', () => {
    const outputSchema = buildCollectionOutputSchema(ItemSchema);

    expect(outputSchema.type).toBe('object');
    const properties = outputSchema.properties as Record<string, unknown>;
    expect(properties['success']).toBeDefined();
    expect(properties['data']).toBeDefined();
  });

  it('data содержит mode/totalCount/threshold/items/resourceLinks', () => {
    const outputSchema = buildCollectionOutputSchema(ItemSchema);
    const properties = outputSchema.properties as Record<string, unknown>;
    const dataSchema = properties['data'] as { properties: Record<string, unknown> };

    expect(Object.keys(dataSchema.properties)).toEqual(
      expect.arrayContaining(['mode', 'totalCount', 'threshold', 'items', 'resourceLinks'])
    );
  });

  it('с summarySchema добавляет поле summary в data', () => {
    const SummarySchema = z.object({ query: z.string() });
    const outputSchema = buildCollectionOutputSchema(ItemSchema, SummarySchema);
    const properties = outputSchema.properties as Record<string, unknown>;
    const dataSchema = properties['data'] as { properties: Record<string, unknown> };

    expect(dataSchema.properties['summary']).toBeDefined();
  });

  it('без summarySchema поле summary отсутствует', () => {
    const outputSchema = buildCollectionOutputSchema(ItemSchema);
    const properties = outputSchema.properties as Record<string, unknown>;
    const dataSchema = properties['data'] as { properties: Record<string, unknown> };

    expect(dataSchema.properties['summary']).toBeUndefined();
  });
});
