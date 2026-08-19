/**
 * End-to-end тесты CLI-адаптера на заглушках (без реального спавна процесса
 * и без реального `claude` CLI): {@link runCli} с инъецированными
 * `connectorFactory`/`transportFactory` и фикстурой бандла на диске.
 *
 * Покрывает DoD пакета 1.2:
 *  - DoD 2: batch открывает одну сессию (число вызовов transportFactory).
 *  - DoD 3: call с инлайновым JSON даёт тот же результат, что batch из одной
 *    эквивалентной строки.
 *  - DoD 4: write без флага — exit 1, tools/call не отправлен.
 *  - DoD 5: local-side-effect без флага — тоже не выполняется.
 *  - DoD 6: неизвестный инструмент в батче не отправляется на сервер.
 *  - DoD 7: --dangerously-allow-write из переменной окружения не действует.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/run-cli.js';
import type { FakeTransportHandlers } from '../unit/session/fake-transport.js';
import {
  captureIo,
  countingTransportFactory,
  createBundleFixture,
  fakeConnectorWithEnv,
  textToolResult,
} from './test-helpers.js';

const TOOLS = [
  {
    name: 'read_tool',
    title: 'Read Tool',
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'write_tool',
    title: 'Write Tool',
    annotations: { readOnlyHint: false },
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'side_effect_tool',
    title: 'Side Effect Tool',
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: { saveToPath: { type: 'string' } } },
  },
];

function defaultHandlers(callToolImpl?: FakeTransportHandlers['callTool']): FakeTransportHandlers {
  return {
    listTools: () => ({ tools: TOOLS }),
    callTool: callToolImpl ?? ((params: { name: string }) => textToolResult(`ok:${params.name}`)),
  };
}

let bundle: { dir: string; cleanup: () => Promise<void> };

beforeEach(async () => {
  bundle = await createBundleFixture();
});

afterEach(async () => {
  await bundle.cleanup();
});

const ENV = { TOKEN: 'super-secret-token-value-0123456789' };

describe('runCli — list', () => {
  it('печатает инструменты с классом read/write/local-side-effect', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnectorWithEnv(ENV),
        transportFactory: transport.factory,
      }
    );
    expect(exitCode).toBe(0);
    const text = io.stdoutLines.join('');
    expect(text).toContain('read_tool | read');
    expect(text).toContain('write_tool | write');
    expect(text).toContain('side_effect_tool | local-side-effect');
  });
});

describe('runCli — write policy (DoD 4, 5)', () => {
  it('DoD 4: write-инструмент без флага — exit 1, tools/call не отправлен', async () => {
    const io = captureIo();
    const handlers = defaultHandlers();
    const transport = countingTransportFactory(handlers);
    const exitCode = await runCli(
      [
        'node',
        'mcp-dev',
        'call',
        'write_tool',
        '{}',
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
      ],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(1);
    expect(io.stderrLines.join('')).toContain('--dangerously-allow-write');
    const sentMethods = transport.lastTransport()?.sent.map((m) => m.method) ?? [];
    expect(sentMethods).not.toContain('tools/call');
  });

  it('write-инструмент с флагом — доходит до tools/call, exit 0', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const exitCode = await runCli(
      [
        'node',
        'mcp-dev',
        'call',
        'write_tool',
        '{}',
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
        '--dangerously-allow-write',
      ],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(0);
    const sentMethods = transport.lastTransport()?.sent.map((m) => m.method) ?? [];
    expect(sentMethods).toContain('tools/call');
  });

  it('DoD 5: local-side-effect инструмент без флага тоже не выполняется', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const exitCode = await runCli(
      [
        'node',
        'mcp-dev',
        'call',
        'side_effect_tool',
        '{}',
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
      ],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(1);
    const sentMethods = transport.lastTransport()?.sent.map((m) => m.method) ?? [];
    expect(sentMethods).not.toContain('tools/call');
  });

  it('DoD 7: --dangerously-allow-write из переменной окружения процесса не действует', async () => {
    process.env['DANGEROUSLY_ALLOW_WRITE'] = 'true';
    try {
      const io = captureIo();
      const transport = countingTransportFactory(defaultHandlers());
      const exitCode = await runCli(
        [
          'node',
          'mcp-dev',
          'call',
          'write_tool',
          '{}',
          '--server-name',
          'srv',
          '--package-dir',
          bundle.dir,
        ],
        io,
        { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
      );
      expect(exitCode).toBe(1);
      const sentMethods = transport.lastTransport()?.sent.map((m) => m.method) ?? [];
      expect(sentMethods).not.toContain('tools/call');
    } finally {
      delete process.env['DANGEROUSLY_ALLOW_WRITE'];
    }
  });
});

describe('runCli — неизвестный инструмент (DoD 6)', () => {
  it('батч с неизвестным именем: ни одна строка не отправляется, exit 1', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const batchFile = path.join(bundle.dir, 'batch.jsonl');
    await fs.writeFile(
      batchFile,
      `${JSON.stringify({ tool: 'read_tool', args: {} })}\n${JSON.stringify({ tool: 'no_such_tool', args: {} })}\n`,
      'utf-8'
    );
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'batch', batchFile, '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(1);
    expect(io.stderrLines.join('')).toContain('Неизвестный инструмент');
    const sentMethods = transport.lastTransport()?.sent.map((m) => m.method) ?? [];
    expect(sentMethods).not.toContain('tools/call');
  });
});

describe('runCli — batch открывает одну сессию (DoD 2)', () => {
  it('несколько read-вызовов в одном батче — ровно один открытый транспорт', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const batchFile = path.join(bundle.dir, 'batch.jsonl');
    await fs.writeFile(
      batchFile,
      [1, 2, 3].map((n) => JSON.stringify({ tool: 'read_tool', args: { n } })).join('\n') + '\n',
      'utf-8'
    );
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'batch', batchFile, '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(0);
    expect(transport.openCount()).toBe(1);
    const callCount =
      transport.lastTransport()?.sent.filter((m) => m.method === 'tools/call').length ?? 0;
    expect(callCount).toBe(3);
  });

  it('пустой батч — exit 0, сессия вообще не открывается', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const batchFile = path.join(bundle.dir, 'empty.jsonl');
    await fs.writeFile(batchFile, '\n\n', 'utf-8');
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'batch', batchFile, '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(0);
    expect(transport.openCount()).toBe(0);
    expect(io.stderrLines.join('')).toContain('пуст');
  });
});

describe('runCli — call как частный случай batch (DoD 3)', () => {
  it('call с инлайновым JSON даёт тот же результат, что batch из эквивалентной строки', async () => {
    const ioCall = captureIo();
    const transportCall = countingTransportFactory(defaultHandlers());
    const exitCall = await runCli(
      [
        'node',
        'mcp-dev',
        'call',
        'read_tool',
        '{"x":1}',
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
      ],
      ioCall,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transportCall.factory }
    );

    const ioBatch = captureIo();
    const transportBatch = countingTransportFactory(defaultHandlers());
    const batchFile = path.join(bundle.dir, 'single.jsonl');
    await fs.writeFile(
      batchFile,
      `${JSON.stringify({ tool: 'read_tool', args: { x: 1 } })}\n`,
      'utf-8'
    );
    const exitBatch = await runCli(
      ['node', 'mcp-dev', 'batch', batchFile, '--server-name', 'srv', '--package-dir', bundle.dir],
      ioBatch,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transportBatch.factory }
    );

    expect(exitCall).toBe(exitBatch);
    // Сравниваем результаты без вспомогательных полей: durationMs зависит от
    // конкретного прогона, но форма/содержимое результата (кроме timing) должны совпасть.
    const stripDuration = (line: string): unknown => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      delete parsed['durationMs'];
      return parsed;
    };
    const callResult = stripDuration(ioCall.stdoutLines[0] ?? '{}');
    const batchResult = stripDuration(ioBatch.stdoutLines[0] ?? '{}');
    expect(callResult).toEqual(batchResult);
  });
});

describe('runCli — стоп-он-эррор', () => {
  it('--stop-on-error останавливает батч на первой провалившейся строке, остаток помечается как не выполненный', async () => {
    const io = captureIo();
    const handlers: FakeTransportHandlers = {
      listTools: () => ({ tools: TOOLS }),
      callTool: (params: { name: string; arguments?: unknown }) => {
        const args = params.arguments as { n?: number } | undefined;
        if (args?.n === 2) return textToolResult('boom', true);
        return textToolResult(`ok:${String(args?.n)}`);
      },
    };
    const transport = countingTransportFactory(handlers);
    const batchFile = path.join(bundle.dir, 'stop.jsonl');
    await fs.writeFile(
      batchFile,
      [1, 2, 3].map((n) => JSON.stringify({ tool: 'read_tool', args: { n } })).join('\n') + '\n',
      'utf-8'
    );
    const exitCode = await runCli(
      [
        'node',
        'mcp-dev',
        'batch',
        batchFile,
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
        '--stop-on-error',
      ],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(1);
    const results = io.stdoutLines.map(
      (line) => JSON.parse(line) as { line: number; ran: boolean }
    );
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ line: 1, ran: true });
    expect(results[1]).toMatchObject({ line: 2, ran: true, isError: true });
    expect(results[2]).toMatchObject({ line: 3, ran: false });
    const callCount =
      transport.lastTransport()?.sent.filter((m) => m.method === 'tools/call').length ?? 0;
    expect(callCount).toBe(2);
  });
});

describe('runCli — секреты не утекают (защита в глубину поверх канарейки ядра)', () => {
  it('токен из env не встречается в stdout/stderr отказа "бандл не найден"', async () => {
    const io = captureIo();
    const transport = countingTransportFactory(defaultHandlers());
    const missingDir = path.join(bundle.dir, 'nested-missing');
    await fs.mkdir(missingDir, { recursive: true });
    await fs.writeFile(
      path.join(missingDir, 'package.json'),
      JSON.stringify({ name: 'x', bin: 'dist/x.cjs' }),
      'utf-8'
    );

    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', missingDir],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );
    expect(exitCode).toBe(2);
    const combined = [...io.stdoutLines, ...io.stderrLines].join('');
    expect(combined).not.toContain(ENV.TOKEN);
  });

  it('непредвиденный отказ из тела команды проходит через маскер (N4)', async () => {
    // Регресс на N4: `cleanup()` в `finally` снимал guard раньше, чем
    // исключение долетало до `catch` в `runCli`, и стек печатался
    // немаскированным. Отказ моделируется падением печати результатов —
    // это уже после открытия сессии и внутри try/finally с cleanup.
    const stderrLines: string[] = [];
    const io = {
      stdout: (): void => {
        throw new Error(`печать сломалась, а в стеке токен ${ENV.TOKEN}`);
      },
      stderr: (text: string): void => {
        stderrLines.push(text);
      },
    };
    const transport = countingTransportFactory(defaultHandlers());

    const exitCode = await runCli(
      [
        'node',
        'mcp-dev',
        'call',
        'read_tool',
        '{}',
        '--server-name',
        'srv',
        '--package-dir',
        bundle.dir,
      ],
      io,
      { connectorFactory: fakeConnectorWithEnv(ENV), transportFactory: transport.factory }
    );

    expect(exitCode).toBe(1);
    const combined = stderrLines.join('');
    expect(combined).toContain('печать сломалась');
    expect(combined).not.toContain(ENV.TOKEN);
    expect(combined).toContain('***MASKED***');
  });
});
