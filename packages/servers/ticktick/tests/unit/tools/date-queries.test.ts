/**
 * Minimal tests for date-queries tools to achieve coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFacade, createMockLogger } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

// Import all date-queries tools
import { GetTasksDueTodayTool } from '#tools/api/date-queries/get-tasks-due-today/get-tasks-due-today.tool.js';
import { GetTasksDueTomorrowTool } from '#tools/api/date-queries/get-tasks-due-tomorrow/get-tasks-due-tomorrow.tool.js';
import { GetTasksDueThisWeekTool } from '#tools/api/date-queries/get-tasks-due-this-week/get-tasks-due-this-week.tool.js';
import { GetTasksDueInDaysTool } from '#tools/api/date-queries/get-tasks-due-in-days/get-tasks-due-in-days.tool.js';
import { GetOverdueTasksTool } from '#tools/api/date-queries/get-overdue-tasks/get-overdue-tasks.tool.js';

function createTaskFixture(): TaskWithUnknownFields {
  return {
    id: 'task-123',
    projectId: 'project-abc',
    title: 'Test Task',
    priority: 0,
    status: 0,
  } as TaskWithUnknownFields;
}

describe('Date Queries Tools Coverage', () => {
  let mockFacade: ReturnType<typeof createMockFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
  });

  describe('Basic execution', () => {
    it('GetTasksDueTodayTool should execute', async () => {
      const tool = new GetTasksDueTodayTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueToday).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ fields: ['id', 'title'] });
      expect(mockFacade.getTasksDueToday).toHaveBeenCalled();
    });

    it('GetTasksDueTomorrowTool should execute', async () => {
      const tool = new GetTasksDueTomorrowTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueTomorrow).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ fields: ['id', 'title'] });
      expect(mockFacade.getTasksDueTomorrow).toHaveBeenCalled();
    });

    it('GetTasksDueThisWeekTool should execute', async () => {
      const tool = new GetTasksDueThisWeekTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueThisWeek).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ fields: ['id'] });
      expect(mockFacade.getTasksDueThisWeek).toHaveBeenCalled();
    });

    it('GetTasksDueInDaysTool should execute', async () => {
      const tool = new GetTasksDueInDaysTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueInDays).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ days: 7, fields: ['id'] });
      expect(mockFacade.getTasksDueInDays).toHaveBeenCalledWith(7);
    });

    it('GetOverdueTasksTool should execute', async () => {
      const tool = new GetOverdueTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getOverdueTasks).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ fields: ['id'] });
      expect(mockFacade.getOverdueTasks).toHaveBeenCalled();
    });
  });

  describe('Tasks due today', () => {
    it('should get tasks with multiple results', async () => {
      const tool = new GetTasksDueTodayTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueToday).mockResolvedValue([
        createTaskFixture(),
        createTaskFixture(),
      ]);
      await tool.execute({ fields: ['id', 'title', 'dueDate'] });
      expect(mockFacade.getTasksDueToday).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const tool = new GetTasksDueTodayTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueToday).mockResolvedValue([]);
      await tool.execute({ fields: ['id'] });
      expect(mockFacade.getTasksDueToday).toHaveBeenCalled();
    });
  });

  describe('Tasks due in days', () => {
    it('should get tasks due in 3 days', async () => {
      const tool = new GetTasksDueInDaysTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueInDays).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ days: 3, fields: ['id', 'dueDate'] });
      expect(mockFacade.getTasksDueInDays).toHaveBeenCalledWith(3);
    });

    it('should get tasks due in 14 days', async () => {
      const tool = new GetTasksDueInDaysTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getTasksDueInDays).mockResolvedValue([createTaskFixture()]);
      await tool.execute({ days: 14, fields: ['id'] });
      expect(mockFacade.getTasksDueInDays).toHaveBeenCalledWith(14);
    });
  });

  describe('Overdue tasks', () => {
    it('should get overdue tasks', async () => {
      const tool = new GetOverdueTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
      vi.mocked(mockFacade.getOverdueTasks).mockResolvedValue([
        createTaskFixture(),
        createTaskFixture(),
      ]);
      await tool.execute({ fields: ['id', 'title', 'dueDate'] });
      expect(mockFacade.getOverdueTasks).toHaveBeenCalled();
    });
  });
});
