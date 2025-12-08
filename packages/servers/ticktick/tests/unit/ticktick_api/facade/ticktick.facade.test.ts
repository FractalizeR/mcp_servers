// tests/unit/ticktick_api/facade/ticktick.facade.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TickTickFacade } from '../../../../src/ticktick_api/facade/ticktick.facade.js';
import type { ProjectOperationsContainer } from '../../../../src/ticktick_api/facade/containers/project-operations.container.js';
import type { TaskOperationsContainer } from '../../../../src/ticktick_api/facade/containers/task-operations.container.js';

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
  let mockProjectOps: ProjectOperationsContainer;
  let mockTaskOps: TaskOperationsContainer;

  beforeEach(() => {
    mockProjectOps = {
      getProjects: { execute: vi.fn() },
      getProject: { execute: vi.fn() },
      getProjectData: { execute: vi.fn() },
      createProject: { execute: vi.fn() },
      updateProject: { execute: vi.fn() },
      deleteProject: { execute: vi.fn() },
    } as unknown as ProjectOperationsContainer;

    mockTaskOps = {
      getTask: { execute: vi.fn() },
      getTasks: { execute: vi.fn() },
      createTask: { execute: vi.fn() },
      updateTask: { execute: vi.fn() },
      deleteTask: { execute: vi.fn() },
      completeTask: { execute: vi.fn() },
    } as unknown as TaskOperationsContainer;

    facade = new TickTickFacade(mockProjectOps, mockTaskOps);
  });

  // ========== Projects ==========

  describe('getProjects', () => {
    it('should delegate to GetProjectsOperation', async () => {
      const projects = [createProjectFixture()];
      vi.mocked(mockProjectOps.getProjects.execute).mockResolvedValue(projects);

      const result = await facade.getProjects();

      expect(mockProjectOps.getProjects.execute).toHaveBeenCalled();
      expect(result).toBe(projects);
    });
  });

  describe('getProject', () => {
    it('should delegate to GetProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockProjectOps.getProject.execute).mockResolvedValue(project);

      const result = await facade.getProject('project-123');

      expect(mockProjectOps.getProject.execute).toHaveBeenCalledWith('project-123');
      expect(result).toBe(project);
    });
  });

  describe('getProjectData', () => {
    it('should delegate to GetProjectDataOperation', async () => {
      const projectData = { project: createProjectFixture(), tasks: [] };
      vi.mocked(mockProjectOps.getProjectData.execute).mockResolvedValue(projectData);

      const result = await facade.getProjectData('project-123');

      expect(mockProjectOps.getProjectData.execute).toHaveBeenCalledWith('project-123');
      expect(result).toBe(projectData);
    });
  });

  describe('createProject', () => {
    it('should delegate to CreateProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockProjectOps.createProject.execute).mockResolvedValue(project);

      const dto = { name: 'New Project' };
      const result = await facade.createProject(dto);

      expect(mockProjectOps.createProject.execute).toHaveBeenCalledWith(dto);
      expect(result).toBe(project);
    });
  });

  describe('updateProject', () => {
    it('should delegate to UpdateProjectOperation', async () => {
      const project = createProjectFixture();
      vi.mocked(mockProjectOps.updateProject.execute).mockResolvedValue(project);

      const dto = { name: 'Updated Project' };
      const result = await facade.updateProject('project-123', dto);

      expect(mockProjectOps.updateProject.execute).toHaveBeenCalledWith('project-123', dto);
      expect(result).toBe(project);
    });
  });

  describe('deleteProject', () => {
    it('should delegate to DeleteProjectOperation', async () => {
      vi.mocked(mockProjectOps.deleteProject.execute).mockResolvedValue(undefined);

      await facade.deleteProject('project-123');

      expect(mockProjectOps.deleteProject.execute).toHaveBeenCalledWith('project-123');
    });
  });

  // ========== Tasks ==========

  describe('getTask', () => {
    it('should delegate to GetTaskOperation', async () => {
      const task = createTaskFixture();
      vi.mocked(mockTaskOps.getTask.execute).mockResolvedValue(task);

      const result = await facade.getTask('project-123', 'task-123');

      expect(mockTaskOps.getTask.execute).toHaveBeenCalledWith('project-123', 'task-123');
      expect(result).toBe(task);
    });
  });

  describe('getTasks', () => {
    it('should delegate to GetTasksOperation', async () => {
      const batchResult = {
        successful: [createTaskFixture()],
        failed: [],
      };
      vi.mocked(mockTaskOps.getTasks.execute).mockResolvedValue(batchResult);

      const refs = [{ projectId: 'project-123', taskId: 'task-123' }];
      const result = await facade.getTasks(refs);

      expect(mockTaskOps.getTasks.execute).toHaveBeenCalledWith(refs);
      expect(result).toBe(batchResult);
    });
  });

  describe('createTask', () => {
    it('should delegate to CreateTaskOperation', async () => {
      const task = createTaskFixture();
      vi.mocked(mockTaskOps.createTask.execute).mockResolvedValue(task);

      const dto = { title: 'New Task', projectId: 'project-123' };
      const result = await facade.createTask(dto);

      expect(mockTaskOps.createTask.execute).toHaveBeenCalledWith(dto);
      expect(result).toBe(task);
    });
  });

  describe('batchCreateTasks', () => {
    it('should create tasks sequentially and return results', async () => {
      const task1 = createTaskFixture({ id: 'task-1' });
      const task2 = createTaskFixture({ id: 'task-2' });
      vi.mocked(mockTaskOps.createTask.execute)
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);

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
      vi.mocked(mockTaskOps.createTask.execute)
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
      vi.mocked(mockTaskOps.updateTask.execute).mockResolvedValue(task);

      const dto = { title: 'Updated Task' };
      const result = await facade.updateTask('project-123', 'task-123', dto);

      expect(mockTaskOps.updateTask.execute).toHaveBeenCalledWith('project-123', 'task-123', dto);
      expect(result).toBe(task);
    });
  });

  describe('deleteTask', () => {
    it('should delegate to DeleteTaskOperation', async () => {
      vi.mocked(mockTaskOps.deleteTask.execute).mockResolvedValue(undefined);

      await facade.deleteTask('project-123', 'task-123');

      expect(mockTaskOps.deleteTask.execute).toHaveBeenCalledWith('project-123', 'task-123');
    });
  });

  describe('completeTask', () => {
    it('should delegate to CompleteTaskOperation', async () => {
      vi.mocked(mockTaskOps.completeTask.execute).mockResolvedValue(undefined);

      await facade.completeTask('project-123', 'task-123');

      expect(mockTaskOps.completeTask.execute).toHaveBeenCalledWith('project-123', 'task-123');
    });
  });

  // ========== Convenience Methods ==========

  describe('getAllTasks', () => {
    it('should fetch tasks from all projects', async () => {
      const project1 = createProjectFixture({ id: 'project-1' });
      const project2 = createProjectFixture({ id: 'project-2' });
      const task1 = createTaskFixture({ id: 'task-1', projectId: 'project-1' });
      const task2 = createTaskFixture({ id: 'task-2', projectId: 'project-2' });

      vi.mocked(mockProjectOps.getProjects.execute).mockResolvedValue([project1, project2]);
      vi.mocked(mockProjectOps.getProjectData.execute)
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

      vi.mocked(mockProjectOps.getProjects.execute).mockResolvedValue([project]);
      vi.mocked(mockProjectOps.getProjectData.execute).mockResolvedValue({
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

      vi.mocked(mockProjectOps.getProjects.execute).mockResolvedValue([project]);
      vi.mocked(mockProjectOps.getProjectData.execute).mockResolvedValue({
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

      vi.mocked(mockProjectOps.getProjects.execute).mockResolvedValue([project]);
      vi.mocked(mockProjectOps.getProjectData.execute).mockResolvedValue({
        project,
        tasks: [task1, task2],
      });

      const result = await facade.getOverdueTasks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });
  });
});
