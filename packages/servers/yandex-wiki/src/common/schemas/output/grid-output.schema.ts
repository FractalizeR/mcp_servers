/**
 * Zod-схема результата (для outputSchema) сущности Grid Wiki API.
 *
 * Зеркалирует `Grid`/`GridWithUnknownFields` (`#wiki_api/entities/grid.entity.ts`).
 * Не `.strict()` — см. комментарий в `page-output.schema.ts`.
 */

import { z } from 'zod';

const ColumnTypeOutputSchema = z.enum([
  'string',
  'number',
  'date',
  'select',
  'staff',
  'checkbox',
  'ticket',
  'ticket_field',
]);

const TextFormatOutputSchema = z.enum(['yfm', 'wom', 'plain']);

const BGColorOutputSchema = z.enum([
  'blue',
  'yellow',
  'pink',
  'red',
  'green',
  'mint',
  'grey',
  'orange',
  'magenta',
  'purple',
  'copper',
  'ocean',
]);

const GridColumnOutputSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  slug: z.string(),
  type: ColumnTypeOutputSchema,
  required: z.boolean(),
  color: BGColorOutputSchema.optional(),
  width: z.number().optional(),
  width_units: z.enum(['%', 'px']).optional(),
  pinned: z.enum(['left', 'right']).optional(),
  format: TextFormatOutputSchema.optional(),
  multiple: z.boolean().optional(),
  select_options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const GridRowOutputSchema = z.object({
  id: z.string(),
  row: z.array(z.unknown()),
  pinned: z.boolean().optional(),
  color: BGColorOutputSchema.optional(),
});

const SortConfigOutputSchema = z.object({
  column_slug: z.string(),
  direction: z.enum(['asc', 'desc']),
});

const GridStructureOutputSchema = z.object({
  columns: z.array(GridColumnOutputSchema),
  default_sort: z.array(SortConfigOutputSchema).optional(),
});

const GridAttributesOutputSchema = z.object({
  created_at: z.string(),
  modified_at: z.string(),
});

export const GridOutputSchema = z.object({
  created_at: z.string(),
  title: z.string(),
  page: z.object({
    id: z.number(),
    slug: z.string(),
  }),
  revision: z.string(),
  rich_text_format: TextFormatOutputSchema,
  structure: GridStructureOutputSchema,
  rows: z.array(GridRowOutputSchema),
  attributes: GridAttributesOutputSchema.optional(),
  template_id: z.string().optional(),
});

export type GridOutput = z.infer<typeof GridOutputSchema>;
