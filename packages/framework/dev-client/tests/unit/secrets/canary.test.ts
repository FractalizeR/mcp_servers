/**
 * Канарейка контура секретов (DoD 2 пакета 1.1).
 *
 * `masker.test.ts` и `process-guard.test.ts` проверяют функции маскирования
 * изолированно (белый ящик). Этот файл прогоняет одно и то же секретное
 * значение через реальную цепочку компонентов пакета — `DevSession` (на
 * заглушке транспорта), `runBatch`, `installSecretGuard` — и в каждом из
 * режимов, перечисленных в README плана («Тестовый план», «Что именно
 * гарантирует контур секретов»), утверждает единый факт: секрет отсутствует
 * в тексте, который увидел бы вызывающий CLI-слой — ни в сырой форме, ни в
 * форме, прошедшей через `JSON.stringify` (экранирование спецсимволов).
 *
 * Режимы:
 *  - успех — секрет в `content` успешного `tools/call`;
 *  - ошибка — секрет в сообщении исключения `callTool` (сервер упал);
 *  - подробный вывод / ретрансляция stderr дочернего процесса;
 *  - необработанное исключение (`uncaughtException`/`unhandledRejection`);
 *  - JSON-экранированная форма значения (секрет со спецсимволами).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { DevSession } from '../../../src/session/dev-session.js';
import { runBatch, type CallToolSession } from '../../../src/batch/run-batch.js';
import { createMasker } from '../../../src/secrets/masker.js';
import { installSecretGuard } from '../../../src/secrets/process-guard.js';
import { FakeTransport } from '../session/fake-transport.js';

const CANARY_SECRET = 'canary-secret-value-9f8e7d6c5b4a3210';
/** Секрет со спецсимволами — байтовое представление меняется после `JSON.stringify`. */
const CANARY_SECRET_WITH_SPECIALS = 'canary\\special"secret/value_0123456789';

const LAUNCH = { command: 'node', args: ['fake.js'], env: {}, cwd: '/tmp' };

/** Секрет не встречается ни в сырой форме, ни замаскированный текст не выглядит нетронутым. */
function assertMasked(text: string, secret: string): void {
  expect(text).not.toContain(secret);
  expect(text).toContain('***MASKED***');
}

describe('Канарейка контура секретов', () => {
  let uninstallGuard: (() => void) | undefined;

  afterEach(() => {
    uninstallGuard?.();
    uninstallGuard = undefined;
  });

  it('успех: секрет в content успешного tools/call не переживает JSON-сериализацию исхода батча', async () => {
    const masker = createMasker({ clientEnv: { TOKEN: CANARY_SECRET } });
    const transport = new FakeTransport({
      callTool: () => ({
        content: [
          { type: 'text', text: `Ответ сервера содержит token=${CANARY_SECRET} по ошибке` },
        ],
      }),
    });
    const session = await DevSession.open({
      launch: LAUNCH,
      masker,
      transportFactory: () => transport,
    });
    try {
      const outcome = await runBatch(session, [{ tool: 'echo', args: {}, line: 1 }], masker);
      const serialized = JSON.stringify(outcome);
      assertMasked(serialized, CANARY_SECRET);
    } finally {
      await session.close();
    }
  });

  it('ошибка: секрет в сообщении исключения callTool не попадает в исход батча (ran: false)', async () => {
    const masker = createMasker({ clientEnv: { TOKEN: CANARY_SECRET } });
    const failingSession: CallToolSession = {
      callTool: () => {
        throw new Error(`upstream connection failed, leaked env dump: TOKEN=${CANARY_SECRET}`);
      },
    };
    const outcome = await runBatch(failingSession, [{ tool: 'boom', args: {}, line: 1 }], masker);
    const serialized = JSON.stringify(outcome);
    assertMasked(serialized, CANARY_SECRET);
    expect(outcome.results[0]?.ran).toBe(false);
  });

  it('подробный вывод / ретрансляция stderr: секрет в накопленном stderr дочернего процесса замаскирован', async () => {
    const masker = createMasker({ clientEnv: { TOKEN: CANARY_SECRET } });
    const transport = new FakeTransport();
    const session = await DevSession.open({
      launch: LAUNCH,
      masker,
      transportFactory: () => transport,
    });
    try {
      // Секрет разбит на два write() — реалистичная ретрансляция построчного stderr
      // дочернего процесса. Маскер применяется к уже накопленному (объединённому)
      // тексту, поэтому граница чанка не должна помешать маскированию.
      transport.stderr.write(Buffer.from(`[debug] using token=${CANARY_SECRET.slice(0, 10)}`));
      transport.stderr.write(Buffer.from(`${CANARY_SECRET.slice(10)} for request\n`));
      // Дать событию 'data' обработаться (PassThrough эмитит асинхронно).
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertMasked(session.getMaskedStderr(), CANARY_SECRET);
    } finally {
      await session.close();
    }
  });

  it('необработанное исключение: uncaughtException с секретом из реального env не долетает до stderr немаскированным', () => {
    // Секрет строится из объекта, имитирующего process.env (composeEnv/resolveSecretsEnv
    // передают именно такую форму в createMasker) — не изолированный { TOKEN: ... }.
    const fakeProcessEnv = { PATH: '/usr/bin', TRACKER_TOKEN: CANARY_SECRET, LOG_LEVEL: 'info' };
    const masker = createMasker({ clientEnv: {}, parentEnv: fakeProcessEnv });
    const written: string[] = [];
    uninstallGuard = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: () => {
        // no-op: в тесте процесс не должен реально завершиться
      },
    });

    process.emit(
      'uncaughtException',
      new Error(`ENOENT reading config, command line was: --token ${CANARY_SECRET}`)
    );

    assertMasked(written.join(''), CANARY_SECRET);
  });

  it('необработанное исключение: unhandledRejection с секретом тоже маскируется', () => {
    const masker = createMasker({ clientEnv: { TOKEN: CANARY_SECRET } });
    const written: string[] = [];
    uninstallGuard = installSecretGuard({
      masker,
      writeStderr: (text) => written.push(text),
      exit: () => {
        // no-op
      },
    });

    process.emit(
      'unhandledRejection',
      new Error(`rejected with ${CANARY_SECRET}`),
      Promise.resolve()
    );

    assertMasked(written.join(''), CANARY_SECRET);
  });

  it('JSON-экранированная форма: секрет со спецсимволами не совпадает после JSON.stringify исхода батча', async () => {
    const masker = createMasker({ clientEnv: { TOKEN: CANARY_SECRET_WITH_SPECIALS } });
    const transport = new FakeTransport({
      callTool: () => ({
        content: [{ type: 'text', text: `leaked=${CANARY_SECRET_WITH_SPECIALS}` }],
      }),
    });
    const session = await DevSession.open({
      launch: LAUNCH,
      masker,
      transportFactory: () => transport,
    });
    try {
      const outcome = await runBatch(session, [{ tool: 'echo', args: {}, line: 1 }], masker);
      // Симулируем то, что видит вызывающий CLI-слой: сериализацию исхода в JSONL.
      const jsonlLine = JSON.stringify(outcome.results[0]);
      expect(jsonlLine).not.toContain(CANARY_SECRET_WITH_SPECIALS);
      // Экранированная форма (JSON.stringify секрета целиком, без первого/последнего символа
      // кавычки) тоже не должна проскочить нетронутой в итоговой строке.
      const escapedForm = JSON.stringify(CANARY_SECRET_WITH_SPECIALS).slice(1, -1);
      expect(jsonlLine).not.toContain(escapedForm);
      expect(jsonlLine).toContain('***MASKED***');
    } finally {
      await session.close();
    }
  });
});
