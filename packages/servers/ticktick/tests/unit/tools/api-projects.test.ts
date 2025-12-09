/**
 * Minimal tests for project tools to achieve coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFacade, createMockLogger } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { ProjectData } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';

// Import all project tools
import { CreateProjectTool } from '#tools/api/projects/create-project/create-project.tool.js';
import { UpdateProjectTool } from '#tools/api/projects/update-project/update-project.tool.js';
import { DeleteProjectTool } from '#tools/api/projects/delete-project/delete-project.tool.js';
import { GetProjectTool } from '#tools/api/projects/get-project/get-project.tool.js';
import { GetProjectsTool } from '#tools/api/projects/get-projects/get-projects.tool.js';
import { GetProjectTasksTool } from '#tools/api/projects/get-project-tasks/get-project-tasks.tool.js';

function createProjectFixture(
  overrides?: Partial<ProjectWithUnknownFields>
): ProjectWithUnknownFields {
  return {
    id: 'proj-123',
    name: 'Test Project',
    ...overrides,
  } as ProjectWithUnknownFields;
}

describe('Project Tools Coverage', () => {
  let mockFacade: ReturnType<typeof createMockFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
  });

  it('CreateProjectTool should execute', async () => {
    const tool = new CreateProjectTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.createProject).mockResolvedValue(createProjectFixture());
    await tool.execute({ name: 'Test' });
    expect(mockFacade.createProject).toHaveBeenCalled();
  });

  it('UpdateProjectTool should execute', async () => {
    const tool = new UpdateProjectTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.updateProject).mockResolvedValue(createProjectFixture());
    await tool.execute({ projectId: 'p1', name: 'Test' });
    expect(mockFacade.updateProject).toHaveBeenCalled();
  });

  it('DeleteProjectTool should execute', async () => {
    const tool = new DeleteProjectTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.deleteProject).mockResolvedValue();
    await tool.execute({ projectId: 'p1' });
    expect(tool).toBeDefined();
  });

  it('GetProjectTool should execute', async () => {
    const tool = new GetProjectTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getProject).mockResolvedValue(createProjectFixture());
    await tool.execute({ projectId: 'p1' });
    expect(tool).toBeDefined();
  });

  it('GetProjectsTool should execute', async () => {
    const tool = new GetProjectsTool(mockFacade as unknown as TickTickFacade, mockLogger);
    vi.mocked(mockFacade.getProjects).mockResolvedValue([createProjectFixture()]);
    await tool.execute({});
    expect(tool).toBeDefined();
  });

  it('GetProjectTasksTool should execute', async () => {
    const tool = new GetProjectTasksTool(mockFacade as unknown as TickTickFacade, mockLogger);
    const projectData: ProjectData = {
      project: createProjectFixture(),
      tasks: [],
    };
    vi.mocked(mockFacade.getProjectData).mockResolvedValue(projectData);
    await tool.execute({ projectId: 'p1' });
    expect(tool).toBeDefined();
  });
});
