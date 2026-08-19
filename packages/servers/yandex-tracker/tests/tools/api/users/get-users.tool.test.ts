/**
 * Unit тесты для GetUsersTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetUsersTool } from '#tools/api/users/get-users.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { createUserFixture } from '#helpers/common-fixtures.js';

describe('GetUsersTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetUsersTool;

  beforeEach(() => {
    mockTrackerFacade = { getUsers: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetUsersTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если userIds пуст', async () => {
    const result = await tool.execute({ userIds: [], fields: ['uid'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт batch-результат с успешными и упавшими', async () => {
    vi.mocked(mockTrackerFacade.getUsers).mockResolvedValue([
      {
        status: 'fulfilled',
        key: 'ivanov',
        index: 0,
        value: createUserFixture({ uid: '1', login: 'ivanov' }),
      },
      { status: 'rejected', key: 'unknown-user', index: 1, reason: new Error('Not found') },
    ]);

    const result = await tool.execute({
      userIds: ['ivanov', 'unknown-user'],
      fields: ['uid', 'login'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getUsers).toHaveBeenCalledWith(['ivanov', 'unknown-user']);

    const parsed = JSON.parse(getTextContent(result)) as {
      data: { total: number; successful: number; failed: number };
    };
    expect(parsed.data.total).toBe(2);
    expect(parsed.data.successful).toBe(1);
    expect(parsed.data.failed).toBe(1);
  });

  it('обработает исключение facade целиком', async () => {
    vi.mocked(mockTrackerFacade.getUsers).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ userIds: ['a'], fields: ['uid'] });
    expect(result.isError).toBe(true);
  });
});
