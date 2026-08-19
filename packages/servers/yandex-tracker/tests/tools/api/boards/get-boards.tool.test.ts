/**
 * Unit тесты для GetBoardsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBoardsTool } from '#tools/api/boards/get-boards.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('GetBoardsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetBoardsTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getBoards: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetBoardsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт корректное определение инструмента', () => {
    const definition = tool.getDefinition();

    expect(definition.name).toBe(buildToolName('get_boards', MCP_TOOL_PREFIX));
    expect(definition.inputSchema.required).toContain('fields');
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(true);
  });

  it('вернёт список досок при успешном запросе', async () => {
    const boards = [
      { id: '1', self: 'url', version: 1, name: 'Board 1' },
      { id: '2', self: 'url', version: 1, name: 'Board 2' },
    ];
    vi.mocked(mockTrackerFacade.getBoards).mockResolvedValue(boards);

    const result = await tool.execute({ fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getBoards).toHaveBeenCalledWith({ localized: undefined });

    const parsed = JSON.parse(getTextContent(result)) as {
      success: boolean;
      data: { boards: unknown[]; count: number };
    };
    expect(parsed.success).toBe(true);
    expect(parsed.data.count).toBe(2);
    expect(parsed.data.boards).toHaveLength(2);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getBoards).mockRejectedValue(new Error('Network error'));

    const result = await tool.execute({ fields: ['id'] });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(getTextContent(result)) as { error: string };
    expect(parsed.error).toBe('Network error');
  });
});
