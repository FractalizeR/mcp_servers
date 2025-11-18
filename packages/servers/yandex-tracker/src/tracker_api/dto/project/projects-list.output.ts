/**
 * Output DTO для списка проектов
 *
 * ВАЖНО: Используется как возвращаемый тип из GetProjects operation.
 */

import type { ProjectWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции получения списка проектов
 */
export interface ProjectsListOutput {
  /** Список проектов */
  projects: ProjectWithUnknownFields[];

  /** Общее количество проектов (если поддерживается API) */
  total?: number;
}
