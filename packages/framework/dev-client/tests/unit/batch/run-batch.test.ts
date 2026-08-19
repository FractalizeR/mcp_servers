/**
 * Тесты прогона батча на заглушке сессии (CallToolSession) — без спавна процесса.
 *
 * Покрывает: успешный вызов, isError:true (не останавливает батч), исключение
 * при вызове (сервер "упал" — останавливает батч, остаток помечается ran:false),
 * expect (isError/contains), таймаут одного вызова, паузу между вызовами,
 * маскирование секретов в content/structuredContent/error.
 */

import { describe, it, expect, vi } from 'vitest';
import { runBatch, type CallToolSession } from '../../../src/batch/run-batch.js';
import { createMasker } from '../../../src/secrets/masker.js';
import type { BatchCall } from '../../../src/batch/types.js';
import type { CallToolResult } from '@modelcontextprotocol/client';

const NO_OP_MASKER = createMasker({ clientEnv: {} });

function call(overrides: Partial<BatchCall> & { tool: string }): BatchCall {
  return { args: {}, line: 1, ...overrides };
}

describe('runBatch', () => {
  it('успешный вызов: ran true, content присутствует', async () => {
    const session: CallToolSession = {
      callTool: vi
        .fn()
        .mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] } as CallToolResult),
    };
    const outcome = await runBatch(session, [call({ tool: 'a', line: 1 })], NO_OP_MASKER);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toMatchObject({ tool: 'a', ran: true, isError: false });
    expect(outcome.allExpectationsMet).toBe(true);
  });

  it('isError: true — вызов "ран", но не останавливает батч', async () => {
    const session: CallToolSession = {
      callTool: vi
        .fn()
        .mockResolvedValueOnce({ content: [], isError: true } as CallToolResult)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'second ok' }],
        } as CallToolResult),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'bad_args', line: 1 }), call({ tool: 'ok_tool', line: 2 })],
      NO_OP_MASKER
    );
    expect(outcome.results[0]).toMatchObject({ ran: true, isError: true });
    expect(outcome.results[1]).toMatchObject({ ran: true, isError: false });
    expect(session.callTool).toHaveBeenCalledTimes(2);
  });

  it('исключение при вызове (сервер упал) — останавливает батч, остаток помечается ran: false', async () => {
    const session: CallToolSession = {
      callTool: vi
        .fn()
        .mockRejectedValueOnce(new Error('transport closed'))
        .mockResolvedValueOnce({ content: [] } as CallToolResult),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'crashes', line: 1 }), call({ tool: 'never_runs', line: 2 })],
      NO_OP_MASKER
    );
    expect(outcome.results[0]).toMatchObject({ ran: false, tool: 'crashes' });
    expect(outcome.results[0]?.error).toContain('transport closed');
    expect(outcome.results[1]).toMatchObject({ ran: false, tool: 'never_runs' });
    expect(outcome.results[1]?.error).toBeUndefined();
    // Второй tools/call не должен был отправляться вовсе
    expect(session.callTool).toHaveBeenCalledTimes(1);
  });

  it('expect.isError сверяется корректно (совпадение и несовпадение)', async () => {
    const session: CallToolSession = {
      callTool: vi.fn().mockResolvedValue({ content: [], isError: true } as CallToolResult),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'a', line: 1, expect: { isError: true } })],
      NO_OP_MASKER
    );
    expect(outcome.results[0]?.expectationMet).toBe(true);
    expect(outcome.allExpectationsMet).toBe(true);
  });

  it('expect.contains не совпал → expectationMet false, allExpectationsMet false', async () => {
    const session: CallToolSession = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'actual result' }],
      } as CallToolResult),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'a', line: 1, expect: { contains: 'expected substring' } })],
      NO_OP_MASKER
    );
    expect(outcome.results[0]?.expectationMet).toBe(false);
    expect(outcome.allExpectationsMet).toBe(false);
  });

  it('без expect — expectationMet отсутствует (undefined), не считается провалом', async () => {
    const session: CallToolSession = {
      callTool: vi.fn().mockResolvedValue({ content: [] } as CallToolResult),
    };
    const outcome = await runBatch(session, [call({ tool: 'a', line: 1 })], NO_OP_MASKER);
    expect(outcome.results[0]?.expectationMet).toBeUndefined();
    expect(outcome.allExpectationsMet).toBe(true);
  });

  it('таймаут одного вызова — трактуется как падение сервера, помечает ran: false', async () => {
    vi.useFakeTimers();
    const session: CallToolSession = {
      callTool: vi.fn(() => new Promise<CallToolResult>(() => {})), // никогда не резолвится
    };
    const promise = runBatch(session, [call({ tool: 'stuck', line: 1 })], NO_OP_MASKER, {
      timeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(60);
    const outcome = await promise;
    expect(outcome.results[0]).toMatchObject({ ran: false, tool: 'stuck' });
    expect(outcome.results[0]?.error).toContain('Таймаут');
    vi.useRealTimers();
  });

  it('маскирует секреты в content/structuredContent/error', async () => {
    const masker = createMasker({ clientEnv: { TOKEN: 'super-secret-value-0123456789' } });
    const session: CallToolSession = {
      callTool: vi
        .fn()
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'token=super-secret-value-0123456789' }],
          structuredContent: { nested: 'super-secret-value-0123456789' },
        } as CallToolResult)
        .mockRejectedValueOnce(new Error('failed with token super-secret-value-0123456789')),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'a', line: 1 }), call({ tool: 'b', line: 2 })],
      masker
    );
    const serialized = JSON.stringify(outcome);
    expect(serialized).not.toContain('super-secret-value-0123456789');
  });

  it('пауза между вызовами применяется (не после последнего)', async () => {
    vi.useFakeTimers();
    const session: CallToolSession = {
      callTool: vi.fn().mockResolvedValue({ content: [] } as CallToolResult),
    };
    const promise = runBatch(
      session,
      [call({ tool: 'a', line: 1 }), call({ tool: 'b', line: 2 })],
      NO_OP_MASKER,
      { pauseMs: 100 }
    );
    await vi.advanceTimersByTimeAsync(250);
    const outcome = await promise;
    expect(outcome.results).toHaveLength(2);
    vi.useRealTimers();
  });

  it('таймаут одной строки не считается падением сервера: остаток батча выполняется (M4)', async () => {
    // Регресс: любой таймаут выставлял serverDown и обрывал батч.
    const session: CallToolSession = {
      callTool: vi
        .fn()
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve({ content: [] }), 50))
        )
        .mockResolvedValueOnce({ content: [{ type: 'text', text: 'ok' }] } as CallToolResult),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'slow', line: 1 }), call({ tool: 'fast', line: 2 })],
      NO_OP_MASKER,
      { timeoutMs: 5 }
    );
    expect(outcome.results[0]).toMatchObject({ tool: 'slow', ran: false, timedOut: true });
    expect(outcome.results[1]).toMatchObject({ tool: 'fast', ran: true });
    expect(outcome.results[1]?.skipReason).toBeUndefined();
  });

  it('сбой транспорта останавливает батч, пропущенные строки несут причину (M4)', async () => {
    const session: CallToolSession = {
      callTool: vi.fn().mockRejectedValue(new Error('socket hang up')),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'a', line: 1 }), call({ tool: 'b', line: 2 })],
      NO_OP_MASKER
    );
    expect(outcome.results[0]).toMatchObject({ ran: false });
    expect(outcome.results[0]?.timedOut).toBeUndefined();
    expect(outcome.results[1]).toMatchObject({ ran: false, skipReason: 'serverDown' });
  });

  it('два подряд таймаута → allExpectationsMet false (N7: код соответствует доку)', async () => {
    // Регресс на N7: прежняя формула считала выполненными и таймауты, и
    // пропущенные строки — «ожидания сошлись» про вызов, которого не было.
    vi.useFakeTimers();
    const session: CallToolSession = {
      callTool: vi.fn(() => new Promise<CallToolResult>(() => {})),
    };
    const promise = runBatch(
      session,
      [call({ tool: 'a', line: 1 }), call({ tool: 'b', line: 2 })],
      NO_OP_MASKER,
      { timeoutMs: 1000 }
    );
    await vi.advanceTimersByTimeAsync(2500);
    const outcome = await promise;
    vi.useRealTimers();

    expect(outcome.results.every((r) => r.timedOut === true)).toBe(true);
    expect(outcome.allExpectationsMet).toBe(false);
  });

  it('пропущенная из-за падения сервера строка → allExpectationsMet false', async () => {
    const session: CallToolSession = {
      callTool: vi.fn().mockRejectedValue(new Error('transport closed')),
    };
    const outcome = await runBatch(
      session,
      [call({ tool: 'a', line: 1 }), call({ tool: 'b', line: 2 })],
      NO_OP_MASKER
    );
    expect(outcome.results[1]?.skipReason).toBe('serverDown');
    expect(outcome.allExpectationsMet).toBe(false);
  });
});
