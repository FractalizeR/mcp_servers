/**
 * Unit тесты для UpdateSprintTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateSprintTool } from '#tools/api/sprints/update-sprint.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('UpdateSprintTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateSprintTool;

  beforeEach(() => {
    mockTrackerFacade = { updateSprint: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateSprintTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом sprintId', async () => {
    const result = await tool.execute({ sprintId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит спринт без version — предупреждает VERSION_NOT_PROVIDED', async () => {
    const sprint = { id: 1, self: 'url', version: 2, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateSprint).toHaveBeenCalledWith(
      '1',
      { name: 'Renamed' },
      undefined
    );
    const parsed = JSON.parse(getTextContent(result)) as {
      warnings?: Array<{ code: string }>;
    };
    expect(parsed.warnings?.map((w) => w.code)).toContain('VERSION_NOT_PROVIDED');
  });

  it('обновит спринт с явной version — version уходит третьим аргументом, не в теле', async () => {
    const sprint = { id: 1, self: 'url', version: 6, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      name: 'Renamed',
      version: 5,
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateSprint).toHaveBeenCalledWith('1', { name: 'Renamed' }, 5);
    const [, body] = vi.mocked(mockTrackerFacade.updateSprint).mock.calls[0] ?? [];
    expect(body).not.toHaveProperty('version');
    const parsed = JSON.parse(getTextContent(result)) as {
      warnings?: Array<{ code: string }>;
    };
    expect(parsed.warnings?.map((w) => w.code) ?? []).not.toContain('VERSION_NOT_PROVIDED');
  });

  it('примет числовой sprintId (как отдаёт get_sprints) и дойдёт до того же запроса', async () => {
    const sprint = { id: 1, self: 'url', version: 2, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: 1,
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateSprint).toHaveBeenCalledWith(
      '1',
      { name: 'Renamed' },
      undefined
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateSprint).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ sprintId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
