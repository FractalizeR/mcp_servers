import type { WithUnknownFields } from './types.js';

/**
 * Права доступа к странице (`/pages/{id}/access`, пакет 7.2.D плана
 * модернизации MCP 2026-07-28). Форма подтверждена detail-страницами
 * документации (`pagesaccess__create_page_access.md`,
 * `pagesaccess__update_page_access.md`, `pagesaccess__delete_page_access.md`,
 * `pagesaccess__delete_page_accesses.md`).
 *
 * ВНИМАНИЕ: в документированной части API НЕТ эндпоинта «список доступов
 * страницы» — только add/update/delete-single/delete-all (запись). Поэтому
 * здесь нет ни tool, ни entity для чтения списка; агент, добавивший доступ,
 * узнаёт `id` из ответа `yw_add_page_access` — других способов получить его
 * заново через MCP нет.
 */

export type PageAccessRole = 'reader' | 'editor' | 'extra_editor' | 'author';
export type PageAccessInheritance = 'inherited' | 'not_inherited';
export type PageAccessGroupSource = 'dir' | 'cloud' | 'com' | 'staff';

export interface PageAccessUserIdentity {
  readonly uid?: string;
  readonly cloud_uid?: string;
}

export interface PageAccessGroupIdentity {
  readonly src: PageAccessGroupSource;
  readonly id: string;
}

export interface PageAccess {
  readonly id: string;
  readonly role: PageAccessRole;
  readonly created_at?: string;
  readonly inheritance?: PageAccessInheritance;
  readonly user?: PageAccessUserIdentity;
  readonly group?: PageAccessGroupIdentity;
}

export type PageAccessWithUnknownFields = WithUnknownFields<PageAccess>;
