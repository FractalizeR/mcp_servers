import type {
  PageAccessRole,
  PageAccessInheritance,
  PageAccessGroupSource,
} from '#wiki_api/entities/index.js';

/**
 * DTO тел запросов `pages/{id}/access*` (пакет 7.2.D). Формы подтверждены
 * detail-страницами `pagesaccess__create_page_access.md`/
 * `pagesaccess__update_page_access.md`.
 *
 * Локальные (не переиспользующие entity) типы `user`/`group` — поля явно
 * допускают `| undefined` (а не просто `?:`), зеркаля форму, которую
 * `z.infer` даёт для `.optional()` под `exactOptionalPropertyTypes: true`.
 * Без этого TS отклоняет прямую передачу zod-провалидированного объекта из
 * tool в operation — тот же приём, что и в `SearchFiltersDto`
 * (`dto/search/search.dto.ts`), проверено эмпирически при первой попытке.
 */
export interface CreatePageAccessUserDto {
  readonly uid?: string | undefined;
  readonly cloud_uid?: string | undefined;
}

export interface CreatePageAccessGroupDto {
  readonly src: PageAccessGroupSource;
  readonly id: string;
}

export interface CreatePageAccessDto {
  readonly role: PageAccessRole;
  readonly user?: CreatePageAccessUserDto;
  readonly group?: CreatePageAccessGroupDto;
  readonly inheritance?: PageAccessInheritance;
}

export interface UpdatePageAccessDto {
  readonly role: PageAccessRole;
  readonly inheritance?: PageAccessInheritance;
}
