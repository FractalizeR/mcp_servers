/**
 * TickTick Project DTOs
 *
 * Data Transfer Objects for project operations.
 */

import type { ProjectViewMode, ProjectKind } from '#ticktick_api/entities/project.entity.js';

/**
 * DTO for creating a new project
 */
export interface CreateProjectDto {
  /** Project name (required) */
  name: string;
  /** Project color (hex code, e.g., '#FF0000') */
  color?: string;
  /** Display mode (list, kanban, timeline) */
  viewMode?: ProjectViewMode;
  /** Project type (TASK or NOTE) */
  kind?: ProjectKind;
  /** Group ID if project belongs to a folder */
  groupId?: string;
}

/**
 * DTO for updating an existing project
 */
export interface UpdateProjectDto {
  /** Project name */
  name?: string;
  /** Project color (hex code) */
  color?: string;
  /** Display mode (list, kanban, timeline) */
  viewMode?: ProjectViewMode;
  /** Whether project is closed/archived */
  closed?: boolean;
}
