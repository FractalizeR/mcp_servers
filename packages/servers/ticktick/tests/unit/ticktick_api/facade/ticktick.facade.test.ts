// tests/unit/ticktick_api/facade/ticktick.facade.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TickTickFacade } from '../../../../src/ticktick_api/facade/ticktick.facade.js';
import type { GetProjectsOperation } from '../../../../src/ticktick_api/api_operations/projects/get-projects.operation.js';
import type { GetProjectOperation } from '../../../../src/ticktick_api/api_operations/projects/get-project.operation.js';
import type { GetProjectDataOperation } from '../../../../src/ticktick_api/api_operations/projects/get-project-data.operation.js';
import type { CreateProjectOperation } from '../../../../src/ticktick_api/api_operations/projects/create-project.operation.js';
import type { UpdateProjectOperation } from '../../../../src/ticktick_api/api_operations/projects/update-project.operation.js';
import type { DeleteProjectOperation } from '../../../../src/ticktick_api/api_operations/projects/delete-project.operation.js';
import type { GetTaskOperation } from '../../../../src/ticktick_api/api_operations/tasks/get-task.operation.js';
import type { GetTasksOperation } from '../../../../src/ticktick_api/api_operations/tasks/get-tasks.operation.js';
import type { CreateTaskOperation } from '../../../../src/ticktick_api/api_operations/tasks/create-task.operation.js';
import type { UpdateTaskOperation } from '../../../../src/ticktick_api/api_operations/tasks/update-task.operation.js';
import type { DeleteTaskOperation } from '../../../../src/ticktick_api/api_operations/tasks/delete-task.operation.js';
import type { CompleteTaskOperation } from '../../../../src/ticktick_api/api_operations/tasks/complete-task.operation.js';

// Fixtures
function createProjectFixture(overrides = {}) {
  return {
    id: 'project-123',
    name: 'Test Project',
    color: '#ff0000',
    ...overrides,
  };
}

function createTaskFixture(overrides = {}) {
  return {
    id: 'task-123',
    projectId: 'project-123',
    title: 'Test Task',
    content: 'Task content',
    priority: 0,
    status: 0,
    ...overrides,
  };
}

describe('TickTickFacade', () => {
  let facade: TickTickFacade;
  let mockGetProjectsOp: GetProjectsOperation;
  let mockGetProjectOp: GetProjectOperation;
  let mockGetProjectDataOp: GetProjectDataOperation;
  let mockCreateProjectOp: CreateProjectOperation;
  let mockUpdateProjectOp: UpdateProjectOperation;
  let mockDeleteProjectOp: DeleteProjectOperation;
  let mockGetTaskOp: GetTaskOperation;
  let mockGetTasksOp: GetTasksOperation;
  let mockCreateTaskOp: CreateTaskOperation;
  let mockUpdateTaskOp: UpdateTaskOperation;
  let mockDeleteTaskOp: DeleteTaskOperation;
  let mockCompleteTaskOp: CompleteTaskOperation;

  beforeEach(() => {
    mockGetProjectsOp = { execute: vi.fn() } as unknown as GetProjectsOperation;
    mockGetProjectOp = { execute: vi.fn() } as unknown as GetProjectOperation;
    mockGetProjectDataOp = { execute: vi.fn() } as unknown as GetProjectDataOperation;
    mockCreateProjectOp = { execute: vi.fn() } as unknown as CreateProjectOperation;
    mockUpdateProjectOp = { execute: vi.fn() } as unknown as UpdateProjectOperation;
    mockDeleteProjectOp = { execute: vi.fn() } as unknown as DeleteProjectOperation;
    mockGetTaskOp = { execute: vi.fn() } as unknown as GetTaskOperation;
    mockGetTasksOp = { execute: vi.fn() } as unknown as GetTasksOperation;
    mockCreateTaskOp = { execute: vi.fn() } as unknown as CreateTaskOperation;
    mockUpdateTaskOp = { execute: vi.fn() } as unknown as UpdateTaskOperation;
    mockDeleteTaskOp = { execute: vi.fn() } as unknown as DeleteTaskOperation;
    mockCompleteTaskOp = { execute: vi.fn() } as unknown as CompleteTaskOperation;

    facade = new TickTickFacade(
      mockGetProjectsOp,
      mockGetProjectOp,
      mockGetProjectDataOp,
      mockCreateProjectOp,
      mockUpdateProjectOp,
      mockDeleteProjectOp,
      mockGetTaskOp,
      mockGetTasksOp,
      mockCreateTaskOp,
      mockUpdateTaskOp,
      mockDeleteTaskOp,
      mockCompleteTaskOp
    );
  });

  // ========== Projects ==========

  describe('getProjects', () => {
    it('should delegate to GetProjectsOperation', async () => {
      const projects = [createProjectFixture()];
      vi.mocked(mockGetProjectsOp.execute).mockResolvedValue(projects);

      const result = await facade.getProjects();

      expect(mockGetProjectsOp.execute).toHaveBeenCalled();
      expect(result).toBe(projects);
    });
  });

  describe('getProject', () => {
    it('should delegate to GetProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockGetProjectOp.execute).mockResolvedValue(project);

      const result = await facade.getProject('project-123');

      expect(mockGetProjectOp.execute).toHaveBeenCalledWith('project-123');
      expect(result).toBe(project);
    });
  });

  describe('getProjectData', () => {
    it('should delegate to GetProjectDataOperation', async () => {
      const projectData = { project: createProjectFixture(), tasks: [] };
      vi.mocked(mockGetProjectDataOp.execute).mockResolvedValue(projectData);

      const result = await facade.getProjectData('project-123');

      expect(mockGetProjectDataOp.execute).toHaveBeenCalledWith('project-123');
      expect(result).toBe(projectData);
    });
  });

  describe('createProject', () => {
    it('should delegate to CreateProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockCreateProjectOp.execute).mockResolvedValue(project);

      const dto = { name: 'New Project' };
      const result = await facade.createProject(dto);

      expect(mockCreateProjectOp.execute).toHaveBeenCalledWith(dto);
      expect(result).toBe(project);
    });
  });

  describe('updateProject', () => {
    it('should delegate to UpdateProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockUpdateProjectOp.execute).mockResolvedValue(project);

      const dto = { name: 'Updated Project' };
      const result = await facade.updateProject('project-123', dto);

      expect(mockUpdateProjectOp.execute).toHaveBeenCalledWith('project-123', dto);
      expect(result).toBe(project);
    });
  });

  describe('deleteProject', () => {
    it('should delegate to DeleteProjectOperation', async () => {
      vi.mocked(mockDeleteProjectOp.execute).mockResolvedValue(undefined);

      await facade.deleteProject('project-123');

      expect(mockDeleteProjectOp.execute).toHaveBeenCalledWith('project-123');
    });
  });

  // ========== Tasks ==========

  describe('getTask', () => {
    it('should delegate to GetTaskOperation', async () => {
      const task = createTaskFixture();
      vi.mocked(mockGetTaskOp.execute).mockResolvedValue(task);

      const result = await facade.getTask('project-123', 'task-123');

      expect(mockGetTaskOp.execute).toHaveBeenCalledWith('project-123', 'task-123');
      expect(result).toBe(task);
    });
  });

  describe('getTasks', () => {
    it('should delegate to GetTasksOperation', async () => {
      const batchResult = {
        successful: [createTaskFixture()],
        failed: [],
      };
      vi.mocked(mockGetTasksOp.execute).mockResolvedValue(batchResult);

      const refs = [{ projectId: 'project-123', taskId: 'task-123' }];
      const result = await facade.getTasks(refs);

      expect(mockGetTasksOp.execute).toHaveBeenCalledWith(refs);
      expect(result).toBe(batchResult);
    });
  });

  describe('createTask', () => {
    it('should delegate to CreateTaskOperation', async () => {
      const task = createTaskFixture();
      vi.mocked(mockCreateTaskOp.execute).mockResolvedValue(task);

      const dto = { title: 'New Task', projectId: 'project-123' };
      const result = await facade.createTask(dto);

      expect(mockCreateTaskOp.execute).toHaveBeenCalledWith(dto);
      expect(result).toBe(task);
    });
  });

  describe('batchCreateTasks', () => {
    it('should create tasks sequentially and return results', async () => {
      const task1 = createTaskFixture({ id: 'task-1' });
      const task2 = createTaskFixture({ id: 'task-2' });
      vi.mocked(mockCreateTaskOp.execute).mockResolvedValueOnce(task1).mockResolvedValueOnce(task2);

      const dtos = [
        { title: 'Task 1', projectId: 'project-123' },
        { title: 'Task 2', projectId: 'project-123' },
      ];
      const result = await facade.batchCreateTasks(dtos);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle failures in batch creation', async () => {
      const task1 = createTaskFixture({ id: 'task-1' });
      vi.mocked(mockCreateTaskOp.execute)
        .mockResolvedValueOnce(task1)
        .mockRejectedValueOnce(new Error('API Error'));

      const dtos = [
        { title: 'Task 1', projectId: 'project-123' },
        { title: 'Task 2', projectId: 'project-123' },
      ];
      const result = await facade.batchCreateTasks(dtos);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toBe('API Error');
    });
  });

  describe('updateTask', () => {
    it('should delegate to UpdateTaskOperation', async () => {
      const task = createTaskFixture();
      vi.mocked(mockUpdateTaskOp.execute).mockResolvedValue(task);

      const dto = { title: 'Updated Task' };
      const result = await facade.updateTask('project-123', 'task-123', dto);

      expect(mockUpdateTaskOp.execute).toHaveBeenCalledWith('project-123', 'task-123', dto);
      expect(result).toBe(task);
    });
  });

  describe('deleteTask', () => {
    it('should delegate to DeleteTaskOperation', async () => {
      vi.mocked(mockDeleteTaskOp.execute).mockResolvedValue(undefined);

      await facade.deleteTask('project-123', 'task-123');

      expect(mockDeleteTaskOp.execute).toHaveBeenCalledWith('project-123', 'task-123');
    });
  });

  describe('completeTask', () => {
    it('should delegate to CompleteTaskOperation', async () => {
      vi.mocked(mockCompleteTaskOp.execute).mockResolvedValue(undefined);

      await facade.completeTask('project-123', 'task-123');

      expect(mockCompleteTaskOp.execute).toHaveBeenCalledWith('project-123', 'task-123');
    });
  });

  // ========== Convenience Methods ==========

  describe('getAllTasks', () => {
    it('should fetch tasks from all projects', async () => {
      const project1 = createProjectFixture({ id: 'project-1' });
      const project2 = createProjectFixture({ id: 'project-2' });
      const task1 = createTaskFixture({ id: 'task-1', projectId: 'project-1' });
      const task2 = createTaskFixture({ id: 'task-2', projectId: 'project-2' });

      vi.mocked(mockGetProjectsOp.execute).mockResolvedValue([project1, project2]);
      vi.mocked(mockGetProjectDataOp.execute)
        .mockResolvedValueOnce({ project: project1, tasks: [task1] })
        .mockResolvedValueOnce({ project: project2, tasks: [task2] });

      const result = await facade.getAllTasks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });
  });

  describe('searchTasks', () => {
    it('should filter tasks by query (case-insensitive)', async () => {
      const task1 = createTaskFixture({ id: 'task-1', title: 'Important Task' });
      const task2 = createTaskFixture({ id: 'task-2', title: 'Regular task' });
      const project = createProjectFixture();

      vi.mocked(mockGetProjectsOp.execute).mockResolvedValue([project]);
      vi.mocked(mockGetProjectDataOp.execute).mockResolvedValue({
        project,
        tasks: [task1, task2],
      });

      const result = await facade.searchTasks('important');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });
  });

  describe('getTasksByPriority', () => {
    it('should filter tasks by priority', async () => {
      const task1 = createTaskFixture({ id: 'task-1', priority: 5 }); // high
      const task2 = createTaskFixture({ id: 'task-2', priority: 0 }); // none
      const project = createProjectFixture();

      vi.mocked(mockGetProjectsOp.execute).mockResolvedValue([project]);
      vi.mocked(mockGetProjectDataOp.execute).mockResolvedValue({
        project,
        tasks: [task1, task2],
      });

      const result = await facade.getTasksByPriority(5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return tasks past due date that are not completed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const task1 = createTaskFixture({
        id: 'task-1',
        dueDate: yesterday.toISOString(),
        status: 0, // not completed
      });
      const task2 = createTaskFixture({
        id: 'task-2',
        dueDate: yesterday.toISOString(),
        status: 2, // completed
      });
      const project = createProjectFixture();

      vi.mocked(mockGetProjectsOp.execute).mockResolvedValue([project]);
      vi.mocked(mockGetProjectDataOp.execute).mockResolvedValue({
        project,
        tasks: [task1, task2],
      });

      const result = await facade.getOverdueTasks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });
  });
});
