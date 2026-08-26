/**
 * Unit тесты для ManageSprintLifecycleTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManageSprintLifecycleTool } from '#tools/api/sprints/manage-sprint-lifecycle.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';

describe('ManageSprintLifecycleTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: ManageSprintLifecycleTool;

  beforeEach(() => {
    mockTrackerFacade = { manageSprintLifecycle: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new ManageSprintLifecycleTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при неизвестном action', async () => {
    const result = await tool.execute({ sprintId: '1', action: 'pause', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт ошибку валидации при отсутствующем fields', async () => {
    const result = await tool.execute({ sprintId: '1', action: 'start' });
    expect(result.isError).toBe(true);
  });

  it('запустит спринт (start) без version', async () => {
    const sprint = createSprintFixture({
      id: 1,
      version: 2,
      name: 'Sprint 1',
      status: 'in_progress',
    });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: '1', action: 'start', fields: ['id', 'status'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.manageSprintLifecycle).toHaveBeenCalledWith({
      sprintId: '1',
      action: 'start',
      version: undefined,
    });
    const parsed = JSON.parse(getTextContent(result)) as {
      data: { sprint: unknown; message: string };
    };
    expect(parsed.data.sprint).toEqual({ id: 1, status: 'in_progress' });
    expect(parsed.data.message).toContain('запущен');
  });

  it('запрошенные поля возвращаются, незапрошенные — отсутствуют', async () => {
    const sprint = createSprintFixture({
      id: 1,
      version: 4,
      name: 'Sprint 1',
      status: 'in_progress',
      board: { id: 20, self: 'url', display: 'Board' },
    });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      action: 'start',
      fields: ['id', 'status', 'version'],
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(getTextContent(result)) as { data: { sprint: unknown } };
    expect(parsed.data.sprint).toEqual({ id: 1, status: 'in_progress', version: 4 });
    expect(parsed.data.sprint).not.toHaveProperty('name');
    expect(parsed.data.sprint).not.toHaveProperty('board');
    expect(parsed.data.sprint).not.toHaveProperty('self');
  });

  it('запрошенное отсутствующее в ответе поле даёт FIELDS_WITHOUT_VALUE', async () => {
    const sprint = createSprintFixture({ id: 1, version: 2, status: 'in_progress' });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      action: 'start',
      fields: ['id', 'missingField'],
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(getTextContent(result)) as {
      warnings?: Array<{ code: string }>;
    };
    expect(parsed.warnings?.map((w) => w.code)).toContain('FIELDS_WITHOUT_VALUE');
  });

  it('запустит спринт (start) с явной version — уходит вместе с action, а не в теле', async () => {
    const sprint = createSprintFixture({
      id: 1,
      version: 6,
      name: 'Sprint 1',
      status: 'in_progress',
    });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      action: 'start',
      version: 5,
      fields: ['id'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.manageSprintLifecycle).toHaveBeenCalledWith({
      sprintId: '1',
      action: 'start',
      version: 5,
    });
    const parsed = JSON.parse(getTextContent(result)) as { warnings?: Array<{ code: string }> };
    expect(parsed.warnings).toBeUndefined();
  });

  it('start без version предупреждает VERSION_NOT_PROVIDED, симметрично update_sprint/update_component', async () => {
    const sprint = createSprintFixture({ id: 1, version: 2, status: 'in_progress' });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: '1', action: 'start', fields: ['id'] });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(getTextContent(result)) as { warnings?: Array<{ code: string }> };
    expect(parsed.warnings?.map((w) => w.code)).toContain('VERSION_NOT_PROVIDED');
  });

  it('archive без version предупреждает VERSION_NOT_PROVIDED', async () => {
    const sprint = createSprintFixture({ id: 1, version: 2, archived: true });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: '1', action: 'archive', fields: ['id'] });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(getTextContent(result)) as { warnings?: Array<{ code: string }> };
    expect(parsed.warnings?.map((w) => w.code)).toContain('VERSION_NOT_PROVIDED');
  });

  it('отклонит version вместе с action delete до вызова facade', async () => {
    const result = await tool.execute({
      sprintId: '1',
      action: 'delete',
      version: 5,
      fields: ['id'],
    });

    expect(result.isError).toBe(true);
    expect(mockTrackerFacade.manageSprintLifecycle).not.toHaveBeenCalled();
  });

  it('примет числовой sprintId (как отдаёт get_sprints) и дойдёт до того же запроса', async () => {
    const sprint = createSprintFixture({
      id: 1,
      version: 2,
      name: 'Sprint 1',
      status: 'in_progress',
    });
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: 1, action: 'start', fields: ['id'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.manageSprintLifecycle).toHaveBeenCalledWith({
      sprintId: '1',
      action: 'start',
      version: undefined,
    });
  });

  it('удалит спринт (delete) — sprint в ответе null, версия не уходит, без warnings', async () => {
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(null);

    const result = await tool.execute({ sprintId: '1', action: 'delete', fields: ['id'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.manageSprintLifecycle).toHaveBeenCalledWith({
      sprintId: '1',
      action: 'delete',
      version: undefined,
    });
    const parsed = JSON.parse(getTextContent(result)) as {
      data: { sprint: unknown; message: string };
      warnings?: Array<{ code: string }>;
    };
    expect(parsed.data.sprint).toBeNull();
    expect(parsed.data.message).toContain('удалён');
    expect(parsed.warnings).toBeUndefined();
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockRejectedValue(
      new Error('Sprint already archived')
    );
    const result = await tool.execute({ sprintId: '1', action: 'archive', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
