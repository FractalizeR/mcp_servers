/**
 * Project Operations Container
 *
 * Groups all project-related operations for TickTickFacade.
 * Reduces constructor parameters from 12 to 2.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import { GetProjectsOperation } from '#ticktick_api/api_operations/projects/get-projects.operation.js';
import { GetProjectOperation } from '#ticktick_api/api_operations/projects/get-project.operation.js';
import { GetProjectDataOperation } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import { CreateProjectOperation } from '#ticktick_api/api_operations/projects/create-project.operation.js';
import { UpdateProjectOperation } from '#ticktick_api/api_operations/projects/update-project.operation.js';
import { DeleteProjectOperation } from '#ticktick_api/api_operations/projects/delete-project.operation.js';

@injectable()
export class ProjectOperationsContainer {
  constructor(
    @inject(GetProjectsOperation)
    readonly getProjects: GetProjectsOperation,

    @inject(GetProjectOperation)
    readonly getProject: GetProjectOperation,

    @inject(GetProjectDataOperation)
    readonly getProjectData: GetProjectDataOperation,

    @inject(CreateProjectOperation)
    readonly createProject: CreateProjectOperation,

    @inject(UpdateProjectOperation)
    readonly updateProject: UpdateProjectOperation,

    @inject(DeleteProjectOperation)
    readonly deleteProject: DeleteProjectOperation
  ) {}
}
