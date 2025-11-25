import type { WithUnknownFields } from './types.js';

/**
 * Тип ресурса
 */
export type ResourceType = 'attachment' | 'grid' | 'sharepoint_resource';

/**
 * Ресурс страницы
 */
export interface Resource {
  readonly item: unknown;
  readonly type: ResourceType;
}

/**
 * Ответ со списком ресурсов
 */
export interface ResourcesResponse {
  readonly results: Resource[];
  readonly next_cursor?: string;
  readonly prev_cursor?: string;
}

export type ResourceWithUnknownFields = WithUnknownFields<Resource>;
