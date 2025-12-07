/**
 * TickTickFacade — unified interface for all TickTick API operations
 *
 * Pattern: Facade
 * - Simplifies access to complex API operations subsystem
 * - Single entry point for all TickTick interactions
 * - Provides convenience methods (getAllTasks, searchTasks, etc.)
 *
 * All operations are injected via DI and delegated.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '#composition-root/types.js';

// Project operations
import type { GetProjectsOperation } from '#ticktick_api/api_operations/projects/get-projects.operation.js';
import type { GetProjectOperation } from '#ticktick_api/api_operations/projects/get-project.operation.js';
import type {
  GetProjectDataOperation,
  ProjectData,
} from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import type { CreateProjectOperation } from '#ticktick_api/api_operations/projects/create-project.operation.js';
import type { UpdateProjectOperation } from '#ticktick_api/api_operations/projects/update-project.operation.js';
import type { DeleteProjectOperation } from '#ticktick_api/api_operations/projects/delete-project.operation.js';

// Task operations
import type { GetTaskOperation } from '#ticktick_api/api_operations/tasks/get-task.operation.js';
import type {
  GetTasksOperation,
  TaskRef,
  BatchTaskResult,
} from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import type { CreateTaskOperation } from '#ticktick_api/api_operations/tasks/create-task.operation.js';
import type { UpdateTaskOperation } from '#ticktick_api/api_operations/tasks/update-task.operation.js';
import type { DeleteTaskOperation } from '#ticktick_api/api_operations/tasks/delete-task.operation.js';
import type { CompleteTaskOperation } from '#ticktick_api/api_operations/tasks/complete-task.operation.js';

// Entities and DTOs
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { CreateProjectDto, UpdateProjectDto } from '#ticktick_api/dto/project.dto.js';
import type { CreateTaskDto, UpdateTaskDto } from '#ticktick_api/dto/task.dto.js';

@injectable()
export class TickTickFacade {
  constructor(
    // Project operations
    @inject(TYPES.GetProjectsOperation)
    private readonly getProjectsOp: GetProjectsOperation,

    @inject(TYPES.GetProjectOperation)
    private readonly getProjectOp: GetProjectOperation,

    @inject(TYPES.GetProjectDataOperation)
    private readonly getProjectDataOp: GetProjectDataOperation,

    @inject(TYPES.CreateProjectOperation)
    private readonly createProjectOp: CreateProjectOperation,

    @inject(TYPES.UpdateProjectOperation)
    private readonly updateProjectOp: UpdateProjectOperation,

    @inject(TYPES.DeleteProjectOperation)
    private readonly deleteProjectOp: DeleteProjectOperation,

    // Task operations
    @inject(TYPES.GetTaskOperation)
    private readonly getTaskOp: GetTaskOperation,

    @inject(TYPES.GetTasksOperation)
    private readonly getTasksOp: GetTasksOperation,

    @inject(TYPES.CreateTaskOperation)
    private readonly createTaskOp: CreateTaskOperation,

    @inject(TYPES.UpdateTaskOperation)
    private readonly updateTaskOp: UpdateTaskOperation,

    @inject(TYPES.DeleteTaskOperation)
    private readonly deleteTaskOp: DeleteTaskOperation,

    @inject(TYPES.CompleteTaskOperation)
    private readonly completeTaskOp: CompleteTaskOperation
  ) {}

  // ========== Projects ==========

  /**
   * Get all projects
   */
  async getProjects(): Promise<ProjectWithUnknownFields[]> {
    return this.getProjectsOp.execute();
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<ProjectWithUnknownFields> {
    return this.getProjectOp.execute(projectId);
  }

  /**
   * Get project with all its tasks
   */
  async getProjectData(projectId: string): Promise<ProjectData> {
    return this.getProjectDataOp.execute(projectId);
  }

  /**
   * Create new project
   */
  async createProject(dto: CreateProjectDto): Promise<ProjectWithUnknownFields> {
    return this.createProjectOp.execute(dto);
  }

  /**
   * Update existing project
   */
  async updateProject(projectId: string, dto: UpdateProjectDto): Promise<ProjectWithUnknownFields> {
    return this.updateProjectOp.execute(projectId, dto);
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    return this.deleteProjectOp.execute(projectId);
  }

  // ========== Tasks ==========

  /**
   * Get single task by project and task IDs
   */
  async getTask(projectId: string, taskId: string): Promise<TaskWithUnknownFields> {
    return this.getTaskOp.execute(projectId, taskId);
  }

  /**
   * Get multiple tasks in batch (parallel execution)
   */
  async getTasks(refs: TaskRef[]): Promise<BatchTaskResult> {
    return this.getTasksOp.execute(refs);
  }

  /**
   * Create new task
   */
  async createTask(dto: CreateTaskDto): Promise<TaskWithUnknownFields> {
    return this.createTaskOp.execute(dto);
  }

  /**
   * Update existing task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto
  ): Promise<TaskWithUnknownFields> {
    return this.updateTaskOp.execute(projectId, taskId, dto);
  }

  /**
   * Delete task
   */
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    return this.deleteTaskOp.execute(projectId, taskId);
  }

  /**
   * Complete task (mark as done)
   */
  async completeTask(projectId: string, taskId: string): Promise<void> {
    return this.completeTaskOp.execute(projectId, taskId);
  }

  // ========== Convenience Methods ==========

  /**
   * Get all tasks from all projects
   *
   * Fetches all projects, then gets tasks from each.
   * Results are cached at project level.
   */
  async getAllTasks(): Promise<TaskWithUnknownFields[]> {
    const projects = await this.getProjects();
    const allTasks: TaskWithUnknownFields[] = [];

    for (const project of projects) {
      const data = await this.getProjectData(project.id);
      allTasks.push(...data.tasks);
    }

    return allTasks;
  }

  /**
   * Search tasks by title or content
   *
   * Case-insensitive substring search.
   */
  async searchTasks(query: string): Promise<TaskWithUnknownFields[]> {
    const allTasks = await this.getAllTasks();
    const lowerQuery = query.toLowerCase();

    return allTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.content?.toLowerCase().includes(lowerQuery) ||
        task.desc?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get tasks by priority level
   *
   * @param priority - 0=none, 1=low, 3=medium, 5=high
   */
  async getTasksByPriority(priority: number): Promise<TaskWithUnknownFields[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter((task) => task.priority === priority);
  }

  /**
   * Get tasks due within date range
   *
   * @param startDate - range start (inclusive)
   * @param endDate - range end (inclusive)
   */
  async getTasksDueInRange(startDate: Date, endDate: Date): Promise<TaskWithUnknownFields[]> {
    const allTasks = await this.getAllTasks();

    return allTasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return due >= startDate && due <= endDate;
    });
  }

  /**
   * Get overdue tasks (past due date and not completed)
   */
  async getOverdueTasks(): Promise<TaskWithUnknownFields[]> {
    const allTasks = await this.getAllTasks();
    const now = new Date();

    return allTasks.filter((task) => {
      // Skip completed tasks (status === 2)
      if (task.status === 2) return false;
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now;
    });
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(): Promise<TaskWithUnknownFields[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return this.getTasksDueInRange(startOfDay, endOfDay);
  }

  /**
   * Get tasks due tomorrow
   */
  async getTasksDueTomorrow(): Promise<TaskWithUnknownFields[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfDay = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      23,
      59,
      59,
      999
    );

    return this.getTasksDueInRange(startOfDay, endOfDay);
  }

  /**
   * Get tasks due in N days
   *
   * @param days - number of days from today
   */
  async getTasksDueInDays(days: number): Promise<TaskWithUnknownFields[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startOfToday);
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    return this.getTasksDueInRange(startOfToday, endDate);
  }

  /**
   * Get tasks due this week (Monday to Sunday)
   */
  async getTasksDueThisWeek(): Promise<TaskWithUnknownFields[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Calculate Monday (day 1) as start of week
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    // Sunday is 6 days after Monday
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return this.getTasksDueInRange(monday, sunday);
  }
}
