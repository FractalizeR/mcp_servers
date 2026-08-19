/**
 * Task Operations Container
 *
 * Groups all task-related operations for TickTickFacade.
 * Reduces constructor parameters from 12 to 2.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import { GetTaskOperation } from '#ticktick_api/api_operations/tasks/get-task.operation.js';
import { GetTasksOperation } from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import { CreateTaskOperation } from '#ticktick_api/api_operations/tasks/create-task.operation.js';
import { UpdateTaskOperation } from '#ticktick_api/api_operations/tasks/update-task.operation.js';
import { DeleteTaskOperation } from '#ticktick_api/api_operations/tasks/delete-task.operation.js';
import { CompleteTaskOperation } from '#ticktick_api/api_operations/tasks/complete-task.operation.js';

@injectable()
export class TaskOperationsContainer {
  constructor(
    @inject(GetTaskOperation)
    readonly getTask: GetTaskOperation,

    @inject(GetTasksOperation)
    readonly getTasks: GetTasksOperation,

    @inject(CreateTaskOperation)
    readonly createTask: CreateTaskOperation,

    @inject(UpdateTaskOperation)
    readonly updateTask: UpdateTaskOperation,

    @inject(DeleteTaskOperation)
    readonly deleteTask: DeleteTaskOperation,

    @inject(CompleteTaskOperation)
    readonly completeTask: CompleteTaskOperation
  ) {}
}
