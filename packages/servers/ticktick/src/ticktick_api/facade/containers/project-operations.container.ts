/**
 * Project Operations Container
 *
 * Groups all project-related operations for TickTickFacade.
 * Reduces constructor parameters from 12 to 2.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '#composition-root/types.js';
import type { GetProjectsOperation } from '#ticktick_api/api_operations/projects/get-projects.operation.js';
import type { GetProjectOperation } from '#ticktick_api/api_operations/projects/get-project.operation.js';
import type { GetProjectDataOperation } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import type { CreateProjectOperation } from '#ticktick_api/api_operations/projects/create-project.operation.js';
import type { UpdateProjectOperation } from '#ticktick_api/api_operations/projects/update-project.operation.js';
import type { DeleteProjectOperation } from '#ticktick_api/api_operations/projects/delete-project.operation.js';

@injectable()
export class ProjectOperationsContainer {
  constructor(
    @inject(TYPES.GetProjectsOperation)
    readonly getProjects: GetProjectsOperation,

    @inject(TYPES.GetProjectOperation)
    readonly getProject: GetProjectOperation,

    @inject(TYPES.GetProjectDataOperation)
    readonly getProjectData: GetProjectDataOperation,

    @inject(TYPES.CreateProjectOperation)
    readonly createProject: CreateProjectOperation,

    @inject(TYPES.UpdateProjectOperation)
    readonly updateProject: UpdateProjectOperation,

    @inject(TYPES.DeleteProjectOperation)
    readonly deleteProject: DeleteProjectOperation
  ) {}
}
