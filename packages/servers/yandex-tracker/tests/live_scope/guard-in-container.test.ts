/**
 * Рубеж на боевом пути: через настоящий DI-контейнер и настоящие инструменты.
 *
 * Тесты правил проверяют решение, этот — что решение вообще спрашивают. Между
 * «политика верна» и «сервер защищён» лежит подключение, и ошибка в нём выглядит
 * ровно как работающий рубеж.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry, BaseTool } from '@fractalizer/mcp-core';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';
import type { AxiosInstance } from 'axios';

const SANDBOX_QUEUE = 'TEST';

const fakeConfig: ServerConfig = {
  token: 'fake-token-for-testing',
  orgId: 'fake-org-id',
  apiBase: 'https://api.tracker.yandex.net',
  requestTimeout: 5000,
  maxBatchSize: 50,
  maxConcurrentRequests: 10,
  logLevel: 'error',
  prettyLogs: false,
  logsDir: join(tmpdir(), 'live-scope-logs'),
  logMaxSize: 10485760,
  logMaxFiles: 10,
};

let workDir: string;
let registry: ToolRegistry;
/** Сколько запросов дошло до отправки — единственная проверка «до сети». */
let requestsSent: number;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'live-scope-container-'));
  process.env['YANDEX_TRACKER_LIVE_SCOPE_QUEUE'] = SANDBOX_QUEUE;
  process.env['YANDEX_TRACKER_LIVE_SCOPE_JOURNAL'] = join(workDir, 'journal.jsonl');

  const container = await createContainer(fakeConfig);
  registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
  const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
  const axiosInstance = httpClient.getAxiosInstance?.() as AxiosInstance;
  axiosInstance.defaults.adapter = async (config) => {
    requestsSent += 1;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
});

afterAll(() => {
  delete process.env['YANDEX_TRACKER_LIVE_SCOPE_QUEUE'];
  delete process.env['YANDEX_TRACKER_LIVE_SCOPE_JOURNAL'];
  rmSync(workDir, { recursive: true, force: true });
});

beforeEach(() => {
  requestsSent = 0;
});

async function callTool(name: string, params: Record<string, unknown>): Promise<string> {
  const tool = registry.getTool(`fr_yandex_tracker_${name}`);
  expect(tool, `инструмент ${name} не найден в реестре`).toBeDefined();
  try {
    // Инструмент не бросает: контрактная ошибка приезжает в структуре ответа.
    const result = await (tool as BaseTool).execute(params);
    return JSON.stringify(result);
  } catch (error) {
    return (error as Error).message;
  }
}

describe('Рубеж в собранном контейнере', () => {
  it('удаление проекта не доходит до сети', async () => {
    const message = await callTool('delete_project', { projectId: '11' });

    expect(requestsSent).toBe(0);
    expect(message).toContain('организации целиком');
  });

  it('правка задачи чужой очереди не доходит до сети', async () => {
    const message = await callTool('update_issue', {
      issueId: 'PROD-1',
      summary: 'взлом',
      fields: ['id'],
    });

    expect(requestsSent).toBe(0);
    expect(message).toContain('PROD-1');
  });

  it('загрузка вложения перехвачена, хотя идёт мимо IHttpClient', async () => {
    // upload_attachment отправляет multipart через getAxiosInstance(): рубеж на
    // уровне методов IHttpClient не увидел бы именно этот мутирующий запрос.
    const message = await callTool('upload_attachment', {
      issueId: 'PROD-1',
      filePath: join(workDir, 'nonexistent.txt'),
      fields: ['id'],
    });

    expect(requestsSent).toBe(0);
    expect(message).not.toBe('<без ошибки>');
  });

  it('создание задачи в песочной очереди проходит — рубеж не парализует прогон', async () => {
    // Половина ценности рубежа в том, что он пропускает законное: защита,
    // отклоняющая всё, неотличима от неработающего прогона.
    const message = await callTool('create_issue', {
      queue: SANDBOX_QUEUE,
      summary: 'проверка рубежа',
      fields: ['id'],
    });

    expect(requestsSent, message).toBeGreaterThan(0);
  });

  it('чтение чужой очереди рубежом не ограничено', async () => {
    const message = await callTool('get_issues', { issueIds: ['PROD-1'], fields: ['id'] });

    expect(requestsSent, message).toBeGreaterThan(0);
  });
});
