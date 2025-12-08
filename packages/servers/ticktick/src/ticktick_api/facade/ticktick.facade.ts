/**
 * TickTickFacade — unified interface for all TickTick API operations
 *
 * Pattern: Facade + Parameter Object
 * - Simplifies access to complex API operations subsystem
 * - Single entry point for all TickTick interactions
 * - Provides convenience methods (getAllTasks, searchTasks, etc.)
 * - Uses Operations Containers to reduce constructor parameters (12 → 2)
 *
 * All operations are injected via DI and delegated.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '#composition-root/types.js';
import type { ProjectOperationsContainer } from './containers/project-operations.container.js';
import type { TaskOperationsContainer } from './containers/task-operations.container.js';

// Types from operations
import type { ProjectData } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import type {
  TaskRef,
  BatchTaskResult,
} from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';

// Entities and DTOs
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { CreateProjectDto, UpdateProjectDto } from '#ticktick_api/dto/project.dto.js';
import type { CreateTaskDto, UpdateTaskDto } from '#ticktick_api/dto/task.dto.js';

@injectable()
export class TickTickFacade {
  constructor(
    @inject(TYPES.ProjectOperationsContainer)
    private readonly projectOps: ProjectOperationsContainer,

    @inject(TYPES.TaskOperationsContainer)
    private readonly taskOps: TaskOperationsContainer
  ) {}

  // ========== Projects ==========

  /**
   * Get all projects
   */
  async getProjects(): Promise<ProjectWithUnknownFields[]> {
    return this.projectOps.getProjects.execute();
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<ProjectWithUnknownFields> {
    return this.projectOps.getProject.execute(projectId);
  }

  /**
   * Get project with all its tasks
   */
  async getProjectData(projectId: string): Promise<ProjectData> {
    return this.projectOps.getProjectData.execute(projectId);
  }

  /**
   * Create new project
   */
  async createProject(dto: CreateProjectDto): Promise<ProjectWithUnknownFields> {
    return this.projectOps.createProject.execute(dto);
  }

  /**
   * Update existing project
   */
  async updateProject(projectId: string, dto: UpdateProjectDto): Promise<ProjectWithUnknownFields> {
    return this.projectOps.updateProject.execute(projectId, dto);
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    return this.projectOps.deleteProject.execute(projectId);
  }

  // ========== Tasks ==========

  /**
   * Get single task by project and task IDs
   */
  async getTask(projectId: string, taskId: string): Promise<TaskWithUnknownFields> {
    return this.taskOps.getTask.execute(projectId, taskId);
  }

  /**
   * Get multiple tasks in batch (parallel execution)
   */
  async getTasks(refs: TaskRef[]): Promise<BatchTaskResult> {
    return this.taskOps.getTasks.execute(refs);
  }

  /**
   * Create new task
   */
  async createTask(dto: CreateTaskDto): Promise<TaskWithUnknownFields> {
    return this.taskOps.createTask.execute(dto);
  }

  /**
   * Batch result for create operations
   */
  /**
   * Create multiple tasks
   *
   * Tasks are created sequentially to respect API rate limits.
   * Returns results with success/failure for each task.
   */
  async batchCreateTasks(
    dtos: CreateTaskDto[]
  ): Promise<{ successful: TaskWithUnknownFields[]; failed: { index: number; error: string }[] }> {
    const successful: TaskWithUnknownFields[] = [];
    const failed: { index: number; error: string }[] = [];

    for (const [index, dto] of dtos.entries()) {
      try {
        const task = await this.taskOps.createTask.execute(dto);
        successful.push(task);
      } catch (error) {
        failed.push({
          index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Update existing task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto
  ): Promise<TaskWithUnknownFields> {
    return this.taskOps.updateTask.execute(projectId, taskId, dto);
  }

  /**
   * Delete task
   */
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    return this.taskOps.deleteTask.execute(projectId, taskId);
  }

  /**
   * Complete task (mark as done)
   */
  async completeTask(projectId: string, taskId: string): Promise<void> {
    return this.taskOps.completeTask.execute(projectId, taskId);
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
