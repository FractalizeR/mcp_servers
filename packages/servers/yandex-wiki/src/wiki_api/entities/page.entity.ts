import type { WithUnknownFields } from './types.js';

/**
 * Тип страницы Wiki
 */
export type PageType = 'page' | 'grid' | 'cloud_page' | 'wysiwyg' | 'template';

/**
 * Атрибуты страницы
 */
export interface PageAttributes {
  readonly created_at: string;
  readonly modified_at: string;
  readonly lang?: string;
  readonly is_readonly: boolean;
  readonly comments_count: number;
  readonly comments_enabled: boolean;
  readonly keywords?: string[];
  readonly is_collaborative?: boolean;
  readonly is_draft?: boolean;
}

/**
 * Breadcrumb (навигационная цепочка)
 */
export interface Breadcrumb {
  readonly page_exists: boolean;
  readonly slug: string;
  readonly title: string;
  readonly id?: number;
}

/**
 * Redirect информация
 */
export interface PageRedirect {
  readonly page_id: number;
  readonly redirect_target: Page;
}

/**
 * Страница Wiki
 */
export interface Page {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly page_type: PageType;
  readonly attributes?: PageAttributes;
  readonly breadcrumbs?: Breadcrumb[];
  readonly content?: unknown;
  readonly redirect?: PageRedirect;
}

export type PageWithUnknownFields = WithUnknownFields<Page>;

/**
 * Элемент поддерева раздела (`GET /pages/{id}/descendants`,
 * `GET /pages/descendants` — пакет 7.2.C плана модернизации MCP 2026-07-28).
 *
 * Документация возвращает только `id`/`slug` для каждого потомка — не полный
 * `Page` (в отличие от `redirect.redirect_target`). `title` в ответе НЕТ.
 */
export interface PageDescendant {
  readonly id: number;
  readonly slug: string;
}

export interface PageDescendantsResponse {
  readonly results: PageDescendant[];
  readonly next_cursor?: string;
  readonly prev_cursor?: string;
}
