/**
 * Тесты разбора аргументов: три команды, обязательные глобальные опции,
 * дефолты `batch`, и DoD 7 — `--dangerously-allow-write` не читается из
 * переменных окружения (только из argv).
 */

import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../../src/cli/parse-args.js';
import { captureIo } from './test-helpers.js';

function argv(...args: string[]): string[] {
  return ['node', 'mcp-dev', ...args];
}

describe('parseCliArgs', () => {
  it('list: разбирает обязательные опции и дефолты флагов', () => {
    const io = captureIo();
    const result = parseCliArgs(argv('list', '--server-name', 'srv', '--package-dir', '.'), {
      writeOut: io.stdout,
      writeErr: io.stderr,
    });
    expect(result.outcome).toBe('command');
    if (result.outcome !== 'command') throw new Error('unreachable');
    expect(result.value).toMatchObject({ command: 'list', json: false, writableOnly: false });
    expect(result.value.global.serverName).toBe('srv');
  });

  it('list: --json и --writable', () => {
    const io = captureIo();
    const result = parseCliArgs(
      argv('list', '--server-name', 'srv', '--package-dir', '.', '--json', '--writable'),
      { writeOut: io.stdout, writeErr: io.stderr }
    );
    if (result.outcome !== 'command' || result.value.command !== 'list')
      throw new Error('unreachable');
    expect(result.value.json).toBe(true);
    expect(result.value.writableOnly).toBe(true);
  });

  it('call: позиционные tool и argsInput, allowWrite по умолчанию false', () => {
    const io = captureIo();
    const result = parseCliArgs(
      argv('call', 'my_tool', '{"a":1}', '--server-name', 'srv', '--package-dir', '.'),
      { writeOut: io.stdout, writeErr: io.stderr }
    );
    if (result.outcome !== 'command' || result.value.command !== 'call')
      throw new Error('unreachable');
    expect(result.value.tool).toBe('my_tool');
    expect(result.value.argsInput).toBe('{"a":1}');
    expect(result.value.allowWrite).toBe(false);
  });

  it('call: --dangerously-allow-write из argv включает allowWrite', () => {
    const io = captureIo();
    const result = parseCliArgs(
      argv(
        'call',
        'my_tool',
        '{}',
        '--server-name',
        'srv',
        '--package-dir',
        '.',
        '--dangerously-allow-write'
      ),
      { writeOut: io.stdout, writeErr: io.stderr }
    );
    if (result.outcome !== 'command' || result.value.command !== 'call')
      throw new Error('unreachable');
    expect(result.value.allowWrite).toBe(true);
  });

  it('batch: дефолты --delay-ms=0, --call-timeout-ms=30000, --stop-on-error=false', () => {
    const io = captureIo();
    const result = parseCliArgs(
      argv('batch', 'calls.jsonl', '--server-name', 'srv', '--package-dir', '.'),
      { writeOut: io.stdout, writeErr: io.stderr }
    );
    if (result.outcome !== 'command' || result.value.command !== 'batch')
      throw new Error('unreachable');
    expect(result.value.delayMs).toBe(0);
    expect(result.value.callTimeoutMs).toBe(30_000);
    expect(result.value.stopOnError).toBe(false);
  });

  it('batch: --delay-ms/--call-timeout-ms/--stop-on-error парсятся из argv', () => {
    const io = captureIo();
    const result = parseCliArgs(
      argv(
        'batch',
        'calls.jsonl',
        '--server-name',
        'srv',
        '--package-dir',
        '.',
        '--delay-ms',
        '250',
        '--call-timeout-ms',
        '5000',
        '--stop-on-error'
      ),
      { writeOut: io.stdout, writeErr: io.stderr }
    );
    if (result.outcome !== 'command' || result.value.command !== 'batch')
      throw new Error('unreachable');
    expect(result.value.delayMs).toBe(250);
    expect(result.value.callTimeoutMs).toBe(5000);
    expect(result.value.stopOnError).toBe(true);
  });

  it('отсутствие --server-name — ошибка разбора, код возврата не 0', () => {
    const io = captureIo();
    const result = parseCliArgs(argv('list', '--package-dir', '.'), {
      writeOut: io.stdout,
      writeErr: io.stderr,
    });
    expect(result.outcome).toBe('exit');
    if (result.outcome !== 'exit') throw new Error('unreachable');
    expect(result.code).not.toBe(0);
  });

  it('неизвестная команда — ошибка разбора', () => {
    const io = captureIo();
    const result = parseCliArgs(argv('frobnicate'), { writeOut: io.stdout, writeErr: io.stderr });
    expect(result.outcome).toBe('exit');
  });

  it('--help — выход с кодом 0, без исключения', () => {
    const io = captureIo();
    const result = parseCliArgs(argv('--help'), { writeOut: io.stdout, writeErr: io.stderr });
    expect(result.outcome).toBe('exit');
    if (result.outcome !== 'exit') throw new Error('unreachable');
    expect(result.code).toBe(0);
  });

  it('DoD 7: --dangerously-allow-write не читается из переменной окружения — только из argv', () => {
    const plausibleEnvVarNames = [
      'MCP_DEV_DANGEROUSLY_ALLOW_WRITE',
      'DANGEROUSLY_ALLOW_WRITE',
      'MCP_DEV_ALLOW_WRITE',
    ];
    const saved: Record<string, string | undefined> = {};
    for (const name of plausibleEnvVarNames) {
      saved[name] = process.env[name];
      process.env[name] = 'true';
    }
    try {
      const io = captureIo();
      const result = parseCliArgs(
        argv('call', 'my_tool', '{}', '--server-name', 'srv', '--package-dir', '.'),
        { writeOut: io.stdout, writeErr: io.stderr }
      );
      if (result.outcome !== 'command' || result.value.command !== 'call')
        throw new Error('unreachable');
      expect(result.value.allowWrite).toBe(false);
    } finally {
      for (const name of plausibleEnvVarNames) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });
});
