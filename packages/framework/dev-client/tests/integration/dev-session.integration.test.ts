/**
 * Интеграционные тесты (DoD 8 пакета 1.1): настоящая MCP-сессия против
 * реально собранного локального бандла одного из серверов монорепо,
 * подключённого в записи Claude Code на машине разработчика.
 *
 * Не входит в `validate`/`validate:quiet` — запускается отдельно:
 * `npm run test:integration` (см. `vitest.integration.config.ts`).
 *
 * Пропускается целиком (пропуск = выполнение DoD, не провал), если:
 *  - CLI `claude` не установлен;
 *  - ни один из известных серверов монорепо не подключён в его записи
 *    (`resolveSecretsEnv` не вернул `ok`) или его локальный бандл не собран
 *    /устарел (`resolveLocalBundle` не вернул `ok`) — типичная ситуация в
 *    релизном CI и на свежем чекауте без `npm run build` в пакете сервера.
 *
 * Покрытие (README плана, «Тестовый план», Integration): сессия против
 * реального бандла; `list`; успешный `call`; неизвестный инструмент;
 * невалидные аргументы; батч в одной сессии; закрытие сессии.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSecretsEnv } from '../../src/launch/resolve-secrets-env.js';
import { resolveLocalBundle } from '../../src/launch/resolve-local-bundle.js';
import { composeEnv } from '../../src/launch/compose-env.js';
import { createMasker } from '../../src/secrets/masker.js';
import { DevSession } from '../../src/session/dev-session.js';
import { runBatch } from '../../src/batch/run-batch.js';
import type { CallToolResult } from '@modelcontextprotocol/client';

function extractText(result: CallToolResult): string {
  const blocks = (result.content ?? []) as ReadonlyArray<{ type?: string; text?: string }>;
  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n');
}

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../..');

interface Candidate {
  readonly serverName: string;
  readonly packageDir: string;
  /** Безопасный readOnly-вызов без параметров, есть у всех серверов монорепо. */
  readonly validTool: string;
  /** readOnly-инструмент с обязательными параметрами — вызывается без них для теста "невалидные аргументы". */
  readonly invalidArgsTool: string;
}

const CANDIDATES: readonly Candidate[] = [
  {
    serverName: 'fractalizer_mcp_yandex_tracker',
    packageDir: path.join(REPO_ROOT, 'packages/servers/yandex-tracker'),
    validTool: 'fr_yandex_tracker_ping',
    invalidArgsTool: 'fr_yandex_tracker_get_queue',
  },
  {
    serverName: 'fractalizer_mcp_yandex_wiki',
    packageDir: path.join(REPO_ROOT, 'packages/servers/yandex-wiki'),
    validTool: 'yw_ping',
    invalidArgsTool: 'yw_get_page',
  },
];

interface ReadyEnvironment {
  readonly candidate: Candidate;
  readonly launch: {
    command: string;
    args: readonly string[];
    env: Record<string, string>;
    cwd: string;
  };
  readonly masker: ReturnType<typeof createMasker>;
}

async function claudeCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('claude', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function findReadyEnvironment(): Promise<ReadyEnvironment | undefined> {
  for (const candidate of CANDIDATES) {
    const secrets = await resolveSecretsEnv(candidate.serverName);
    if (secrets.outcome !== 'ok') continue;
    const bundle = await resolveLocalBundle(candidate.packageDir);
    if (bundle.outcome !== 'ok') continue;

    const env = composeEnv(secrets.env);
    return {
      candidate,
      launch: { command: 'node', args: [bundle.path], env, cwd: candidate.packageDir },
      masker: createMasker({ clientEnv: secrets.env, parentEnv: process.env }),
    };
  }
  return undefined;
}

let ready: ReadyEnvironment | undefined;
let skipReason = '';

beforeAll(async () => {
  const cliAvailable = await claudeCliAvailable();
  if (!cliAvailable) {
    skipReason = 'claude CLI не найден в PATH';
    return;
  }
  ready = await findReadyEnvironment();
  if (!ready) {
    skipReason =
      'ни один известный сервер монорепо не подключён в записи claude mcp, либо его локальный бандл не собран/устарел (npm run build)';
  }
});

describe('Интеграция: DevSession против реального локального бандла', () => {
  it('открывает сессию, перечисляет и вызывает инструменты, закрывается — либо пропускается с объяснением', async () => {
    if (!ready) {
      console.info(`[test:integration] пропущено: ${skipReason}`);
      expect(true).toBe(true);
      return;
    }

    const { candidate, launch, masker } = ready;

    const session = await DevSession.open({ launch, masker, handshakeTimeoutMs: 20_000 });
    try {
      // list
      const tools = await session.listTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some((tool) => tool.name === candidate.validTool)).toBe(true);

      // успешный call
      const pingResult = await session.callTool(candidate.validTool, {});
      expect(pingResult.isError).not.toBe(true);

      // неизвестный инструмент — серверы этого монорепо не бросают протокольную
      // ошибку, а отвечают обычным CallToolResult с isError: true и списком
      // доступных инструментов (см. содержимое ответа ниже). Наблюдаемый исход
      // всё равно отличим от "невалидных аргументов" — по тексту ответа, а не
      // по факту исключения/успеха.
      const unknownToolResult = await session.callTool('this_tool_does_not_exist_at_all', {});
      expect(unknownToolResult.isError).toBe(true);

      // невалидные аргументы — тоже CallToolResult с isError: true, но другое сообщение
      const invalidArgsResult = await session.callTool(candidate.invalidArgsTool, {});
      expect(invalidArgsResult.isError).toBe(true);

      const unknownToolText = extractText(unknownToolResult);
      const invalidArgsText = extractText(invalidArgsResult);
      expect(unknownToolText).not.toBe(invalidArgsText);

      // батч в одной сессии: успешный вызов + невалидные аргументы одного вызова
      const batchOutcome = await runBatch(
        session,
        [
          { tool: candidate.validTool, args: {}, line: 1 },
          { tool: candidate.invalidArgsTool, args: {}, line: 2, expect: { isError: true } },
        ],
        masker
      );
      expect(batchOutcome.results).toHaveLength(2);
      expect(batchOutcome.results[0]?.ran).toBe(true);
      expect(batchOutcome.results[1]?.ran).toBe(true);
      expect(batchOutcome.results[1]?.isError).toBe(true);
      expect(batchOutcome.allExpectationsMet).toBe(true);
    } finally {
      // закрытие сессии — дважды, идемпотентность не должна вешать процесс
      await session.close();
      await session.close();
    }
  });
});
