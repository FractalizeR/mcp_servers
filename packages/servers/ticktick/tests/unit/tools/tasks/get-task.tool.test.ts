// tests/unit/tools/tasks/get-task.tool.test.ts
import { describe, it, expect } from 'vitest';
import { GetTaskTool } from '../../../../src/tools/tasks/get-task/get-task.tool.js';
import { GET_TASK_TOOL_METADATA } from '../../../../src/tools/tasks/get-task/get-task.metadata.js';

describe('GetTaskTool', () => {
  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(GetTaskTool.METADATA).toBe(GET_TASK_TOOL_METADATA);
      expect(GetTaskTool.METADATA.name).toBe('fr_ticktick_get_task');
      expect(GetTaskTool.METADATA.description).toBeDefined();
    });
  });

  describe('schema', () => {
    it('should have required parameters', () => {
      // Verify that schema exists
      const tool = GetTaskTool.prototype;
      expect(tool.getParamsSchema).toBeDefined();
    });
  });
});
