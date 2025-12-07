/**
 * Operation Definitions for DI Container
 *
 * Maps DI symbols to operation classes for automatic registration.
 * Used by container.ts for dynamic binding.
 */

import { TYPES } from '../types.js';

// Project operations
import { GetProjectsOperation } from '#ticktick_api/api_operations/projects/get-projects.operation.js';
import { GetProjectOperation } from '#ticktick_api/api_operations/projects/get-project.operation.js';
import { GetProjectDataOperation } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import { CreateProjectOperation } from '#ticktick_api/api_operations/projects/create-project.operation.js';
import { UpdateProjectOperation } from '#ticktick_api/api_operations/projects/update-project.operation.js';
import { DeleteProjectOperation } from '#ticktick_api/api_operations/projects/delete-project.operation.js';

// Task operations
import { GetTaskOperation } from '#ticktick_api/api_operations/tasks/get-task.operation.js';
import { GetTasksOperation } from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import { CreateTaskOperation } from '#ticktick_api/api_operations/tasks/create-task.operation.js';
import { UpdateTaskOperation } from '#ticktick_api/api_operations/tasks/update-task.operation.js';
import { DeleteTaskOperation } from '#ticktick_api/api_operations/tasks/delete-task.operation.js';
import { CompleteTaskOperation } from '#ticktick_api/api_operations/tasks/complete-task.operation.js';

/**
 * Operation definition: maps symbol to class
 */
export interface OperationDefinition {
  /** DI symbol for binding */
  symbol: symbol;
  /** Operation class constructor */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operationClass: new (...args: any[]) => unknown;
  /** Whether this operation needs ServerConfig in constructor */
  needsConfig: boolean;
}

/**
 * All operation definitions
 *
 * NOTE: GetTasksOperation needs config for ParallelExecutor,
 * other operations only need httpClient, cacheManager, logger.
 */
export const OPERATION_DEFINITIONS: OperationDefinition[] = [
  // Project operations
  {
    symbol: TYPES.GetProjectsOperation,
    operationClass: GetProjectsOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.GetProjectOperation,
    operationClass: GetProjectOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.GetProjectDataOperation,
    operationClass: GetProjectDataOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.CreateProjectOperation,
    operationClass: CreateProjectOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.UpdateProjectOperation,
    operationClass: UpdateProjectOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.DeleteProjectOperation,
    operationClass: DeleteProjectOperation,
    needsConfig: false,
  },

  // Task operations
  {
    symbol: TYPES.GetTaskOperation,
    operationClass: GetTaskOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.GetTasksOperation,
    operationClass: GetTasksOperation,
    needsConfig: true, // needs config for ParallelExecutor
  },
  {
    symbol: TYPES.CreateTaskOperation,
    operationClass: CreateTaskOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.UpdateTaskOperation,
    operationClass: UpdateTaskOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.DeleteTaskOperation,
    operationClass: DeleteTaskOperation,
    needsConfig: false,
  },
  {
    symbol: TYPES.CompleteTaskOperation,
    operationClass: CompleteTaskOperation,
    needsConfig: false,
  },
];
