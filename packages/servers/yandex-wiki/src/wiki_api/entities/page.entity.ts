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
