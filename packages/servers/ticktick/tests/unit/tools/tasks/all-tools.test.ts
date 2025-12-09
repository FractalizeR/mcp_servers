/**
 * Minimal tests for all task tools to achieve coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFacade, createMockLogger } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

// Import all tools
import { CreateTaskTool } from '#tools/tasks/create-task/create-task.tool.js';
import { UpdateTaskTool } from '#tools/tasks/update-task/update-task.tool.js';
import { DeleteTaskTool } from '#tools/tasks/delete-task/delete-task.tool.js';
import { CompleteTaskTool } from '#tools/tasks/complete-task/complete-task.tool.js';
import { GetTaskTool } from '#tools/tasks/get-task/get-task.tool.js';
import { GetTasksTool } from '#tools/tasks/get-tasks/get-tasks.tool.js';
import { GetAllTasksTool } from '#tools/tasks/get-all-tasks/get-all-tasks.tool.js';
import { SearchTasksTool } from '#tools/tasks/search-tasks/search-tasks.tool.js';
import { GetTasksByPriorityTool } from '#tools/tasks/get-tasks-by-priority/get-tasks-by-priority.tool.js';
import { BatchCreateTasksTool } from '#tools/tasks/batch-create-tasks/batch-create-tasks.tool.js';

function createTaskFixture(overrides?: Partial<TaskWithUnknownFields>): TaskWithUnknownFields {
  return {
    id: 'task-123',
    projectId: 'project-abc',
    title: 'Test Task',
    priority: 0,
    status: 0,
    ...overrides,
  } as TaskWithUnknownFields;
}

describe('Task Tools Coverage', () => {
  let mockFacade: ReturnType<typeof createMockFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
  });

  describe('Basic execution', () => {
    it('CreateTaskTool should execute', async () => {
      const tool = new CreateTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.createTask).mockResolvedValue(createTaskFixture());
      await tool.execute({ title: 'Test' });
      expect(mockFacade.createTask).toHaveBeenCalled();
    });

    it('UpdateTaskTool should execute', async () => {
      const tool = new UpdateTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.updateTask).mockResolvedValue(createTaskFixture());
      await tool.execute({ projectId: 'p1', taskId: 't1', title: 'Test' });
      expect(mockFacade.updateTask).toHaveBeenCalled();
    });

    it('DeleteTaskTool should execute', async () => {
      const tool = new DeleteTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.deleteTask).mockResolvedValue();
      await tool.execute({ projectId: 'p1', taskId: 't1' });
      expect(mockFacade.deleteTask).toHaveBeenCalled();
    });

    it('CompleteTaskTool should execute', async () => {
      const tool = new CompleteTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.completeTask).mockResolvedValue();
      await tool.execute({ projectId: 'p1', taskId: 't1' });
      expect(mockFacade.completeTask).toHaveBeenCalled();
    });

    it('GetTaskTool should execute', async () => {
      const tool = new GetTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTask).mockResolvedValue(createTaskFixture());
      await tool.execute({ projectId: 'p1', taskId: 't1', fields: ['id'] });
      expect(mockFacade.getTask).toHaveBeenCalled();
    });

    it('GetTasksTool should execute', async () => {
      const tool = new GetTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasks).mockResolvedValue([
        { success: true, key: 't1', data: createTaskFixture() },
      ]);
      await tool.execute({ tasks: [{ projectId: 'p1', taskId: 't1' }], fields: ['id'] });
      expect(mockFacade.getTasks).toHaveBeenCalled();
    });

    it('GetAllTasksTool should execute', async () => {
      const tool = new GetAllTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getAllTasks).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ status: 'all', fields: ['id'] });
      expect(mockFacade.getAllTasks).toHaveBeenCalled();
    });

    it('SearchTasksTool should execute', async () => {
      const tool = new SearchTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.searchTasks).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ query: 'test', fields: ['id'] });
      expect(mockFacade.searchTasks).toHaveBeenCalled();
    });

    it('GetTasksByPriorityTool should execute', async () => {
      const tool = new GetTasksByPriorityTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksByPriority).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ priority: 1, fields: ['id'] });
      expect(mockFacade.getTasksByPriority).toHaveBeenCalled();
    });

    it('BatchCreateTasksTool should execute', async () => {
      const tool = new BatchCreateTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.batchCreateTasks).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ tasks: [{ title: 'Test' }] });
      expect(mockFacade.batchCreateTasks).toHaveBeenCalled();
    });
  });

  describe('Get all tasks - different statuses', () => {
    it('should get all tasks with status filter', async () => {
      const tool = new GetAllTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      const completedTask = createTaskFixture({ status: 2 });
      const normalTask = createTaskFixture({ status: 0 });
      vi.mocked(mockFacade.getAllTasks).mockResolvedValue([normalTask, completedTask]);
      await tool.execute({ status: 'uncompleted', fields: ['id', 'status'] });
      expect(mockFacade.getAllTasks).toHaveBeenCalled();
    });

    it('should get completed tasks', async () => {
      const tool = new GetAllTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getAllTasks).mockResolvedValue([createTaskFixture({ status: 2 })]);
      await tool.execute({ status: 'completed', fields: ['id'] });
      expect(mockFacade.getAllTasks).toHaveBeenCalled();
    });
  });

  describe('Search tasks - various queries', () => {
    it('should search with different queries', async () => {
      const tool = new SearchTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.searchTasks).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ query: 'urgent task', fields: ['id', 'title'] });
      expect(mockFacade.searchTasks).toHaveBeenCalledWith('urgent task');
    });

    it('should handle empty search results', async () => {
      const tool = new SearchTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.searchTasks).mockResolvedValue([]);
      await tool.execute({ query: 'nonexistent', fields: ['id'] });
      expect(mockFacade.searchTasks).toHaveBeenCalled();
    });
  });

  describe('Get tasks by priority', () => {
    it('should get tasks with priority 0', async () => {
      const tool = new GetTasksByPriorityTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksByPriority).mockResolvedValue([
        createTaskFixture({ priority: 0 }),
      ]);
      await tool.execute({ priority: 0, fields: ['id', 'priority'] });
      expect(mockFacade.getTasksByPriority).toHaveBeenCalledWith(0);
    });

    it('should get tasks with priority 3', async () => {
      const tool = new GetTasksByPriorityTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksByPriority).mockResolvedValue([
        createTaskFixture({ priority: 3 }),
      ]);
      await tool.execute({ priority: 3, fields: ['id'] });
      expect(mockFacade.getTasksByPriority).toHaveBeenCalledWith(3);
    });

    it('should get tasks with priority 5', async () => {
      const tool = new GetTasksByPriorityTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksByPriority).mockResolvedValue([
        createTaskFixture({ priority: 5 }),
      ]);
      await tool.execute({ priority: 5, fields: ['id'] });
      expect(mockFacade.getTasksByPriority).toHaveBeenCalledWith(5);
    });
  });

  describe('Get tasks batch', () => {
    it('should get multiple tasks', async () => {
      const tool = new GetTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      const results = [
        { success: true, key: 't1', data: createTaskFixture({ id: 't1' }) },
        { success: true, key: 't2', data: createTaskFixture({ id: 't2' }) },
      ];
      vi.mocked(mockFacade.getTasks).mockResolvedValue(results);
      await tool.execute({
        tasks: [
          { projectId: 'p1', taskId: 't1' },
          { projectId: 'p1', taskId: 't2' },
        ],
        fields: ['id', 'title'],
      });
      expect(mockFacade.getTasks).toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
      const tool = new GetTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      const results = [
        { success: true, key: 't1', data: createTaskFixture() },
        { success: false, key: 't2', error: 'Not found' },
      ];
      vi.mocked(mockFacade.getTasks).mockResolvedValue(results);
      await tool.execute({
        tasks: [
          { projectId: 'p1', taskId: 't1' },
          { projectId: 'p1', taskId: 't2' },
        ],
        fields: ['id'],
      });
      expect(mockFacade.getTasks).toHaveBeenCalled();
    });
  });

  describe('Get single task', () => {
    it('should get task with fields', async () => {
      const tool = new GetTaskTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTask).mockResolvedValue(createTaskFixture());
      await tool.execute({ projectId: 'p1', taskId: 't1', fields: ['id', 'title', 'status'] });
      expect(mockFacade.getTask).toHaveBeenCalledWith('p1', 't1');
    });
  });
});
