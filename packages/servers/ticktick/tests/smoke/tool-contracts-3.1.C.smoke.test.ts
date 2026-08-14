/**
 * Smoke Test: пакет 3.1.C.ticktick (annotations/outputSchema/title/
 * redactionAllowlist для всех 25 инструментов TickTick)
 *
 * Обходит реестр инструментов через TOOL_CLASSES (не список имён в коде —
 * см. план .agentic-planning/plan_mcp_2026_modernization/3.1_tool_contracts_parallel.md,
 * раздел «Пакеты 3.1.C.{tracker,wiki,ticktick}»), поэтому тест ловит и
 * будущие инструменты, забывшие про annotations/outputSchema.
 *
 * DoD пакета:
 * 1. Все 25 инструментов имеют annotations и outputSchema.
 * 2. structuredContent валиден по outputSchema — представители каждой категории.
 * 3. tools/list (через projectToolDefinitionsForList) отдаёт title, outputSchema,
 *    annotations.
 * 4. redactionAllowlist заполнен осмысленно: пользовательский текст
 *    (заголовок/содержимое задачи, поисковый запрос, название проекта) в
 *    allow-list не попал.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { projectToolDefinitionsForList } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { GetTaskTool } from '#tools/tasks/get-task/index.js';
import { CreateTaskTool } from '#tools/tasks/create-task/index.js';
import { UpdateTaskTool } from '#tools/tasks/update-task/index.js';
import { DeleteProjectTool } from '#tools/api/projects/delete-project/index.js';
import { GetProjectTool } from '#tools/api/projects/get-project/index.js';
import { GetTasksTool } from '#tools/tasks/get-tasks/index.js';
import { GetTasksDueTodayTool } from '#tools/api/date-queries/get-tasks-due-today/index.js';
import { GetEngagedTasksTool } from '#tools/helpers/gtd/get-engaged-tasks/index.js';
import { RawApiRequestTool } from '#tools/api/raw/index.js';
import { PingTool } from '#tools/ping.tool.js';
import { CREATE_TASK_TOOL_METADATA } from '#tools/tasks/create-task/create-task.metadata.js';
import { UPDATE_TASK_TOOL_METADATA } from '#tools/tasks/update-task/update-task.metadata.js';
import { CREATE_PROJECT_TOOL_METADATA } from '#tools/api/projects/create-project/create-project.metadata.js';
import { SEARCH_TASKS_TOOL_METADATA } from '#tools/tasks/search-tasks/search-tasks.metadata.js';

const ajv = new Ajv2020({ strict: false });

const EXPECTED_TOOL_COUNT = 25;

describe('Tool Contracts 3.1.C (Smoke) — annotations / outputSchema / title / redactionAllowlist', () => {
  let mockFacade: TickTickFacade;
  let mockLogger: Logger;

  beforeAll(() => {
    mockFacade = {} as TickTickFacade;
    mockLogger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      child: () => mockLogger,
    } as unknown as Logger;
  });

  it('в реестре ровно 25 инструментов TickTick (сверка с планом этапа 3.1.C)', () => {
    expect(TOOL_CLASSES.length).toBe(EXPECTED_TOOL_COUNT);
  });

  describe('DoD 1: каждый инструмент имеет annotations', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: definition.annotations определён`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        expect(definition.annotations).toBeDefined();
        expect(typeof definition.annotations?.readOnlyHint).toBe('boolean');
        expect(typeof definition.annotations?.destructiveHint).toBe('boolean');
        expect(typeof definition.annotations?.idempotentHint).toBe('boolean');
        expect(typeof definition.annotations?.openWorldHint).toBe('boolean');
      });
    });
  });

  describe('DoD 1: каждый инструмент имеет outputSchema', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: definition.outputSchema определён и валиден как JSON Schema 2020-12`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        expect(definition.outputSchema).toBeDefined();
        expect(definition.outputSchema?.type).toBe('object');
        expect(() => ajv.compile(definition.outputSchema as object)).not.toThrow();
      });
    });
  });

  describe('DoD 3: tools/list (projectToolDefinitionsForList) отдаёт title/outputSchema/annotations', () => {
    it('каждый элемент списка содержит все три поля', () => {
      const definitions: ToolDefinition[] = TOOL_CLASSES.map((ToolClass) =>
        new ToolClass(mockFacade, mockLogger).getDefinition()
      );
      const listEntries = projectToolDefinitionsForList(definitions);

      expect(listEntries).toHaveLength(EXPECTED_TOOL_COUNT);
      listEntries.forEach((entry) => {
        expect(entry.title, `${entry.name}: отсутствует title`).toBeDefined();
        expect(entry.outputSchema, `${entry.name}: отсутствует outputSchema`).toBeDefined();
        expect(entry.annotations, `${entry.name}: отсутствуют annotations`).toBeDefined();
      });
    });
  });

  describe('DoD 4: redactionAllowlist заполнен осмысленно (identifiers only, без пользовательского текста)', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: METADATA.redactionAllowlist — массив (заполнено явно, не undefined)`, () => {
        expect(Array.isArray(ToolClass.METADATA.redactionAllowlist)).toBe(true);
      });
    });

    it('create_task: заголовок/содержимое/теги задачи НЕ в allow-list (только projectId)', () => {
      const list = CREATE_TASK_TOOL_METADATA.redactionAllowlist ?? [];
      expect(list).toEqual(['projectId']);
      expect(list).not.toContain('title');
      expect(list).not.toContain('content');
      expect(list).not.toContain('tags');
      expect(list).not.toContain('items');
    });

    it('update_task: новый заголовок/содержимое задачи НЕ в allow-list', () => {
      const list = UPDATE_TASK_TOOL_METADATA.redactionAllowlist ?? [];
      expect(list).not.toContain('title');
      expect(list).not.toContain('content');
      expect(list).not.toContain('tags');
      expect(list).toContain('projectId');
      expect(list).toContain('taskId');
    });

    it('create_project: название проекта НЕ в allow-list', () => {
      const list = CREATE_PROJECT_TOOL_METADATA.redactionAllowlist ?? [];
      expect(list).not.toContain('name');
    });

    it('search_tasks: поисковый запрос (query) НЕ в allow-list', () => {
      const list = SEARCH_TASKS_TOOL_METADATA.redactionAllowlist ?? [];
      expect(list).not.toContain('query');
    });
  });

  describe('DoD 2: structuredContent валиден по outputSchema — представители каждой категории', () => {
    it('PingTool (helpers/system): connected-ответ соответствует outputSchema', async () => {
      const facade = {
        getProjects: async () => [{ id: 'p1', name: 'Inbox' }],
      } as unknown as TickTickFacade;
      const tool = new PingTool(facade, mockLogger);

      const result = await tool.execute({});
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('GetTaskTool (tasks/read): ответ соответствует outputSchema (в т.ч. недокументированное поле API)', async () => {
      const facade = {
        getTask: async () => ({
          id: 't1',
          projectId: 'p1',
          title: 'Test task',
          priority: 0,
          status: 0,
          createdTime: '2026-01-01T00:00:00.000Z',
          modifiedTime: '2026-01-01T00:00:00.000Z',
          undocumentedApiField: 'should be allowed by additionalProperties',
        }),
      } as unknown as TickTickFacade;
      const tool = new GetTaskTool(facade, mockLogger);

      const result = await tool.execute({
        projectId: 'p1',
        taskId: 't1',
        fields: ['id', 'title', 'undocumentedApiField'],
      });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('CreateTaskTool (tasks/write): ответ соответствует outputSchema', async () => {
      const facade = {
        createTask: async () => ({
          id: 't2',
          projectId: 'p1',
          title: 'New task',
          priority: 0,
          status: 0,
          createdTime: '2026-01-01T00:00:00.000Z',
          modifiedTime: '2026-01-01T00:00:00.000Z',
        }),
      } as unknown as TickTickFacade;
      const tool = new CreateTaskTool(facade, mockLogger);

      const result = await tool.execute({ title: 'New task' });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('UpdateTaskTool (tasks/write, destructive+idempotent): ответ соответствует outputSchema', async () => {
      const facade = {
        updateTask: async () => ({
          id: 't1',
          projectId: 'p1',
          title: 'Updated',
          priority: 3,
          status: 0,
          createdTime: '2026-01-01T00:00:00.000Z',
          modifiedTime: '2026-01-02T00:00:00.000Z',
        }),
      } as unknown as TickTickFacade;
      const tool = new UpdateTaskTool(facade, mockLogger);

      const result = await tool.execute({ projectId: 'p1', taskId: 't1', title: 'Updated' });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('GetTasksTool (tasks/read, batch): ответ соответствует outputSchema (successful + failed)', async () => {
      const facade = {
        getTasks: async () => [
          {
            status: 'fulfilled' as const,
            key: { projectId: 'p1', taskId: 't1' },
            value: {
              id: 't1',
              projectId: 'p1',
              title: 'Task 1',
              priority: 0,
              status: 0,
              createdTime: '2026-01-01T00:00:00.000Z',
              modifiedTime: '2026-01-01T00:00:00.000Z',
            },
          },
          {
            status: 'rejected' as const,
            key: { projectId: 'p1', taskId: 't2' },
            reason: new Error('not found'),
          },
        ],
      } as unknown as TickTickFacade;
      const tool = new GetTasksTool(facade, mockLogger);

      const result = await tool.execute({
        tasks: [
          { projectId: 'p1', taskId: 't1' },
          { projectId: 'p1', taskId: 't2' },
        ],
        fields: ['id', 'title'],
      });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('GetProjectTool (projects/read): ответ соответствует outputSchema', async () => {
      const facade = {
        getProject: async () => ({ id: 'p1', name: 'Inbox', kind: 'TASK' }),
      } as unknown as TickTickFacade;
      const tool = new GetProjectTool(facade, mockLogger);

      const result = await tool.execute({ projectId: 'p1', fields: ['id', 'name'] });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('DeleteProjectTool (projects/write, destructive): ответ соответствует outputSchema', async () => {
      const facade = {
        getProject: async () => ({ id: 'p1', name: 'Inbox' }),
        deleteProject: async () => undefined,
      } as unknown as TickTickFacade;
      const tool = new DeleteProjectTool(facade, mockLogger);

      const result = await tool.execute({ projectId: 'p1' });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('GetTasksDueTodayTool (date-queries): ответ соответствует outputSchema', async () => {
      const facade = {
        getTasksDueToday: async () => [
          {
            id: 't1',
            projectId: 'p1',
            title: 'Due today',
            priority: 5,
            status: 0,
            dueDate: '2026-08-14',
            createdTime: '2026-01-01T00:00:00.000Z',
            modifiedTime: '2026-01-01T00:00:00.000Z',
          },
        ],
      } as unknown as TickTickFacade;
      const tool = new GetTasksDueTodayTool(facade, mockLogger);

      const result = await tool.execute({});
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('GetEngagedTasksTool (helpers/gtd): ответ соответствует outputSchema', async () => {
      const facade = {
        getTasksByPriority: async () => [
          {
            id: 't1',
            projectId: 'p1',
            title: 'High prio',
            priority: 5,
            status: 0,
            createdTime: '2026-01-01T00:00:00.000Z',
            modifiedTime: '2026-01-01T00:00:00.000Z',
          },
        ],
        getOverdueTasks: async () => [],
      } as unknown as TickTickFacade;
      const tool = new GetEngagedTasksTool(facade, mockLogger);

      const result = await tool.execute({});
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });

    it('RawApiRequestTool (system, escape hatch): ответ соответствует outputSchema', async () => {
      const facade = {
        rawApiRequest: async () => ({ id: 'p1', name: 'Inbox', arbitraryField: 42 }),
      } as unknown as TickTickFacade;
      const tool = new RawApiRequestTool(facade, mockLogger);

      const result = await tool.execute({
        method: 'GET',
        path: '/project/p1',
        fields: ['id', 'name'],
      });
      const validate = ajv.compile(tool.getDefinition().outputSchema as object);

      expect(validate(result.structuredContent), JSON.stringify(validate.errors)).toBe(true);
    });
  });
});
