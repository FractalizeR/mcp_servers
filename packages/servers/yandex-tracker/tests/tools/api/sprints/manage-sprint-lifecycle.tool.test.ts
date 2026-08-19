/**
 * Unit тесты для ManageSprintLifecycleTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManageSprintLifecycleTool } from '#tools/api/sprints/manage-sprint-lifecycle.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

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
    const result = await tool.execute({ sprintId: '1', action: 'pause' });
    expect(result.isError).toBe(true);
  });

  it('запустит спринт (start)', async () => {
    const sprint = { id: '1', self: 'url', version: 2, name: 'Sprint 1', status: 'in_progress' };
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: '1', action: 'start' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.manageSprintLifecycle).toHaveBeenCalledWith({
      sprintId: '1',
      action: 'start',
    });
    const parsed = JSON.parse(getTextContent(result)) as {
      data: { sprint: unknown; message: string };
    };
    expect(parsed.data.sprint).toEqual(sprint);
    expect(parsed.data.message).toContain('запущен');
  });

  it('удалит спринт (delete) — sprint в ответе null', async () => {
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockResolvedValue(null);

    const result = await tool.execute({ sprintId: '1', action: 'delete' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(getTextContent(result)) as {
      data: { sprint: unknown; message: string };
    };
    expect(parsed.data.sprint).toBeNull();
    expect(parsed.data.message).toContain('удалён');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.manageSprintLifecycle).mockRejectedValue(
      new Error('Sprint already archived')
    );
    const result = await tool.execute({ sprintId: '1', action: 'archive' });
    expect(result.isError).toBe(true);
  });
});
