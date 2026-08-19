/**
 * Unit тесты для DeleteBoardTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteBoardTool } from '#tools/api/boards/delete-board.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('DeleteBoardTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteBoardTool;

  beforeEach(() => {
    mockTrackerFacade = { deleteBoard: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new DeleteBoardTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом boardId', async () => {
    const result = await tool.execute({ boardId: '' });
    expect(result.isError).toBe(true);
  });

  it('удалит доску', async () => {
    vi.mocked(mockTrackerFacade.deleteBoard).mockResolvedValue(undefined);

    const result = await tool.execute({ boardId: '1' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.deleteBoard).toHaveBeenCalledWith('1');
    const parsed = JSON.parse(getTextContent(result)) as { data: { success: boolean } };
    expect(parsed.data.success).toBe(true);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.deleteBoard).mockRejectedValue(new Error('Permission denied'));
    const result = await tool.execute({ boardId: '1' });
    expect(result.isError).toBe(true);
  });

  it('пометит инструмент как destructive', () => {
    expect(DeleteBoardTool.METADATA.annotations?.destructiveHint).toBe(true);
    expect(DeleteBoardTool.METADATA.requiresExplicitUserConsent).toBe(true);
  });
});
