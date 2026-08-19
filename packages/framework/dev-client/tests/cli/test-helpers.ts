/**
 * Общие фикстуры для тестов CLI-адаптера: бандл-фикстура на диске (чтобы
 * {@link resolveLocalBundle} нашёл `outcome: 'ok'` без реального `npm run
 * build`), заглушка коннектора (без реального `claude` CLI), сбор stdout/stderr,
 * счётчик открытых транспортов (для DoD 2 — «одна сессия на батч»).
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MCPConnector } from '@fractalizer/mcp-cli';
import type { GetLaunchSpecResult } from '@fractalizer/mcp-cli';
import type { CliIo } from '../../src/cli/io.js';
import { FakeTransport, type FakeTransportHandlers } from '../unit/session/fake-transport.js';

/** Создать во временном каталоге фикстуру пакета сервера: `package.json` с `bin` + свежий бандл. */
export async function createBundleFixture(): Promise<{
  dir: string;
  cleanup: () => Promise<void>;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-dev-cli-bundle-'));
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture-server', bin: 'dist/server.bundle.cjs' }),
    'utf-8'
  );
  await fs.mkdir(path.join(dir, 'dist'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'dist', 'server.bundle.cjs'),
    '// fixture bundle, never executed (transport is faked)\n'
  );
  return { dir, cleanup: async (): Promise<void> => fs.rm(dir, { recursive: true, force: true }) };
}

/** Заглушка {@link MCPConnector}: только `getLaunchSpec()` используется CLI-адаптером. */
export function fakeConnector(result: GetLaunchSpecResult): (serverName: string) => MCPConnector {
  return (_serverName: string): MCPConnector => ({
    getClientInfo: () => {
      throw new Error('не используется в тестах CLI');
    },
    isInstalled: () => Promise.resolve(true),
    getStatus: () => {
      throw new Error('не используется в тестах CLI');
    },
    connect: () => {
      throw new Error('не используется в тестах CLI');
    },
    disconnect: () => {
      throw new Error('не используется в тестах CLI');
    },
    validateLaunchSpec: () => Promise.resolve([]),
    getLaunchSpec: () => Promise.resolve(result),
  });
}

/** Готовая заглушка коннектора с фиксированным `env` (секреты для маскера/composeEnv). */
export function fakeConnectorWithEnv(
  env: Record<string, string>
): (serverName: string) => MCPConnector {
  return fakeConnector({ outcome: 'found', spec: { command: 'node', args: ['unused.cjs'], env } });
}

/** Перехватчик вывода CLI: `stdout`/`stderr` копятся в массивы строк. */
export interface CapturedIo extends CliIo {
  readonly stdoutLines: string[];
  readonly stderrLines: string[];
}

export function captureIo(): CapturedIo {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdoutLines,
    stderrLines,
    stdout: (text: string): void => {
      stdoutLines.push(text);
    },
    stderr: (text: string): void => {
      stderrLines.push(text);
    },
  };
}

/**
 * Фабрика транспорта, считающая число открытых сессий (= число «спавнов
 * процесса» в терминах DoD 2 пакета 1.2 — реального спавна нет, заглушка).
 */
export function countingTransportFactory(handlers: FakeTransportHandlers): {
  readonly factory: () => FakeTransport;
  readonly openCount: () => number;
  readonly lastTransport: () => FakeTransport | undefined;
} {
  let count = 0;
  let last: FakeTransport | undefined;
  return {
    factory: (): FakeTransport => {
      count += 1;
      last = new FakeTransport(handlers);
      return last;
    },
    openCount: (): number => count,
    lastTransport: (): FakeTransport | undefined => last,
  };
}

/** Строка JSONL для строкового результата вызова инструмента (текстовый content-блок). */
export function textToolResult(text: string, isError = false): unknown {
  return { content: [{ type: 'text', text }], isError };
}
