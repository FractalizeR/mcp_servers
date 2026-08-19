/**
 * Типизированные отказы «сессия не открылась» (exit 2): сервер не подключён,
 * env пуст (симптом маскирования вывода клиентом), бандл отсутствует —
 * см. README плана, раздел «Риски и их обработка».
 */

import * as fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/run-cli.js';
import { createMasker, installSecretGuard } from '../../src/secrets/index.js';
import {
  captureIo,
  createBundleFixture,
  fakeConnector,
  fakeConnectorWithEnv,
} from './test-helpers.js';

let bundle: { dir: string; cleanup: () => Promise<void> };

beforeEach(async () => {
  bundle = await createBundleFixture();
});

afterEach(async () => {
  await bundle.cleanup();
});

describe('runCli — сессия не открывается (exit 2)', () => {
  it('сервер не подключён (notConnected)', async () => {
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnector({ outcome: 'notConnected' }),
      }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('не подключён');
  });

  it('транспорт записи клиента не stdio (notStdio)', async () => {
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnector({ outcome: 'notStdio', transport: 'http' }),
      }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('stdio');
  });

  it('env пуст (emptyEnv) — не запускает сервер без токена', async () => {
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnectorWithEnv({}),
      }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('без токена');
  });

  it('вывод клиента не разобран (unparsable)', async () => {
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnector({
          outcome: 'unparsable',
          reason: 'формат вывода изменился',
        }),
      }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('формат вывода изменился');
  });

  it('бандл не собран (missing) — exit 2, npm run build в подсказке', async () => {
    const io = captureIo();
    await fs.rm(`${bundle.dir}/dist/server.bundle.cjs`);
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnectorWithEnv({ TOKEN: 'irrelevant-but-long-enough' }),
      }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('npm run build');
  });

  it('в package.json сервера нет поля "bin" (invalidPackageJson) — exit 2', async () => {
    const io = captureIo();
    await fs.writeFile(`${bundle.dir}/package.json`, JSON.stringify({ name: 'x' }), 'utf-8');
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnectorWithEnv({ TOKEN: 'irrelevant-but-long-enough' }),
      }
    );
    expect(exitCode).toBe(2);
  });

  it('commandFailed: сырой текст ошибки команды клиента не печатается (M5)', async () => {
    // Этот отказ происходит ДО построения маскера, а `message` коннектора
    // содержит до 200 символов stderr `claude mcp get` — там может лежать env.
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      {
        connectorFactory: fakeConnector({
          outcome: 'commandFailed',
          message: 'Command failed: claude mcp get srv (TRACKER_TOKEN=y0_leaked_secret_value)',
        }),
      }
    );
    expect(exitCode).toBe(2);
    const printed = io.stderrLines.join('');
    expect(printed).not.toContain('y0_leaked_secret_value');
    expect(printed).toContain('claude mcp get');
  });

  it('maskedEnv: значения записи выглядят замаскированными — запуск не выполняется (D2)', async () => {
    const io = captureIo();
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
      io,
      { connectorFactory: fakeConnectorWithEnv({ TRACKER_TOKEN: '***' }) }
    );
    expect(exitCode).toBe(2);
    expect(io.stderrLines.join('')).toContain('замаскированными');
  });

  it('диагностика отсутствующего бандла сохраняет путь (H1: HOME больше не маскируется)', async () => {
    const io = captureIo();
    const emptyDir = await fs.mkdtemp(`${bundle.dir}-empty-`);
    await fs.writeFile(
      `${emptyDir}/package.json`,
      JSON.stringify({ name: 'x', bin: 'dist/server.bundle.cjs' })
    );
    const exitCode = await runCli(
      ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', emptyDir],
      io,
      {
        connectorFactory: fakeConnectorWithEnv({ TRACKER_TOKEN: 'y0_secret_token_value_123456' }),
        parentEnv: { HOME: emptyDir, PATH: '/usr/bin' },
      }
    );
    expect(exitCode).toBe(2);
    // Раньше маскер строился из всех значений env, и путь превращался
    // в `***MASKED***/dist/server.bundle.cjs`.
    expect(io.stderrLines.join('')).toContain(`${emptyDir}/dist/server.bundle.cjs`);
    await fs.rm(emptyDir, { recursive: true, force: true });
  });

  it('непредвиденное исключение печатается замаскированным и даёт код 1 (M5)', async () => {
    const io = captureIo();
    const secret = 'y0_unexpected_path_secret_0123456789';
    const uninstall = installSecretGuard({
      masker: createMasker({ clientEnv: { TRACKER_TOKEN: secret } }),
      writeStderr: () => undefined,
      exit: () => undefined,
    });
    try {
      const exitCode = await runCli(
        ['node', 'mcp-dev', 'list', '--server-name', 'srv', '--package-dir', bundle.dir],
        io,
        {
          connectorFactory: () => {
            throw new Error(`внезапно: ${secret}`);
          },
        }
      );
      expect(exitCode).toBe(1);
      const printed = io.stderrLines.join('');
      expect(printed).not.toContain(secret);
      expect(printed).toContain('***MASKED***');
    } finally {
      uninstall();
    }
  });
});
