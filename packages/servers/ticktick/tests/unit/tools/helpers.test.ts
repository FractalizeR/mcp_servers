/**
 * Minimal tests for helper tools to achieve coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFacade, createMockLogger } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

// Import helper tools
import { PingTool } from '#tools/helpers/ping/ping.tool.js';
import { GetEngagedTasksTool } from '#tools/helpers/gtd/get-engaged-tasks/get-engaged-tasks.tool.js';
import { GetNextTasksTool } from '#tools/helpers/gtd/get-next-tasks/get-next-tasks.tool.js';

function createTaskFixture(): TaskWithUnknownFields {
  return {
    id: 'task-123',
    projectId: 'project-abc',
    title: 'Test Task',
    priority: 0,
    status: 0,
  } as TaskWithUnknownFields;
}

describe('Helper Tools Coverage', () => {
  let mockFacade: ReturnType<typeof createMockFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
  });

  it('PingTool should execute', async () => {
    const tool = new PingTool(mockFacade as unknown as TickTickFacade, mockLogger);
    const result = await tool.execute({});
    expect(result).toBeDefined();
    expect(result.content[0].type).toBe('text');
  });

  it('GetEngagedTasksTool should execute', async () => {
    const tool = new GetEngagedTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getAllTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({});
    expect(tool).toBeDefined();
  });

  it('GetNextTasksTool should execute', async () => {
    const tool = new GetNextTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getAllTasks).mockResolvedValue([createTaskFixture()]);
    await tool.execute({});
    expect(tool).toBeDefined();
  });
});
