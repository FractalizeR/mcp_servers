/**
 * Task Operations Container
 *
 * Groups all task-related operations for TickTickFacade.
 * Reduces constructor parameters from 12 to 2.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '#composition-root/types.js';
import type { GetTaskOperation } from '#ticktick_api/api_operations/tasks/get-task.operation.js';
import type { GetTasksOperation } from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import type { CreateTaskOperation } from '#ticktick_api/api_operations/tasks/create-task.operation.js';
import type { UpdateTaskOperation } from '#ticktick_api/api_operations/tasks/update-task.operation.js';
import type { DeleteTaskOperation } from '#ticktick_api/api_operations/tasks/delete-task.operation.js';
import type { CompleteTaskOperation } from '#ticktick_api/api_operations/tasks/complete-task.operation.js';

@injectable()
export class TaskOperationsContainer {
  constructor(
    @inject(TYPES.GetTaskOperation)
    readonly getTask: GetTaskOperation,

    @inject(TYPES.GetTasksOperation)
    readonly getTasks: GetTasksOperation,

    @inject(TYPES.CreateTaskOperation)
    readonly createTask: CreateTaskOperation,

    @inject(TYPES.UpdateTaskOperation)
    readonly updateTask: UpdateTaskOperation,

    @inject(TYPES.DeleteTaskOperation)
    readonly deleteTask: DeleteTaskOperation,

    @inject(TYPES.CompleteTaskOperation)
    readonly completeTask: CompleteTaskOperation
  ) {}
}
