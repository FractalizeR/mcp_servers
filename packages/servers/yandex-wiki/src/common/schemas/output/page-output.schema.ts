/**
 * Zod-схема результата (для outputSchema) сущности Page Wiki API.
 *
 * Зеркалирует `Page`/`PageWithUnknownFields`
 * (`#wiki_api/entities/page.entity.ts`), но НЕ описывает поле `redirect`
 * (рекурсивная ссылка Page → Page) и намеренно не `.strict()`: реальные
 * ответы API несут произвольные дополнительные поля
 * (`WithUnknownFields<Page>`), а без `additionalProperties: false` на этом
 * вложенном уровне JSON Schema их не отвергает — см. `buildOutputSchema()`
 * (`@fractalizer/mcp-core`, пакет 3.1.G).
 */

import { z } from 'zod';

const PageAttributesOutputSchema = z.object({
  created_at: z.string(),
  modified_at: z.string(),
  lang: z.string().optional(),
  is_readonly: z.boolean(),
  comments_count: z.number(),
  comments_enabled: z.boolean(),
  keywords: z.array(z.string()).optional(),
  is_collaborative: z.boolean().optional(),
  is_draft: z.boolean().optional(),
});

const BreadcrumbOutputSchema = z.object({
  page_exists: z.boolean(),
  slug: z.string(),
  title: z.string(),
  id: z.number().optional(),
});

export const PageOutputSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  page_type: z.enum(['page', 'grid', 'cloud_page', 'wysiwyg', 'template']),
  attributes: PageAttributesOutputSchema.optional(),
  breadcrumbs: z.array(BreadcrumbOutputSchema).optional(),
  content: z.unknown().optional(),
});

export type PageOutput = z.infer<typeof PageOutputSchema>;
