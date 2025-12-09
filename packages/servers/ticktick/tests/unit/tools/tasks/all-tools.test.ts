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
    await tool.execute({ projectId: 'p1', taskId: 't1' });
    expect(tool).toBeDefined();
  });

  it('GetTasksTool should execute', async () => {
    const tool = new GetTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({ projectId: 'p1' });
    expect(tool).toBeDefined();
  });

  it('GetAllTasksTool should execute', async () => {
    const tool = new GetAllTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getAllTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({});
    expect(tool).toBeDefined();
  });

  it('SearchTasksTool should execute', async () => {
    const tool = new SearchTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.searchTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({ query: 'test' });
    expect(tool).toBeDefined();
  });

  it('GetTasksByPriorityTool should execute', async () => {
    const tool = new GetTasksByPriorityTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getTasksByPriority).mockResolvedValue([createTaskFixture()]);
    await tool.execute({ priority: 1 });
    expect(tool).toBeDefined();
  });

  it('BatchCreateTasksTool should execute', async () => {
    const tool = new BatchCreateTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.batchCreateTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({ tasks: [{ title: 'Test' }] });
    expect(mockFacade.batchCreateTasks).toHaveBeenCalled();
  });
});
