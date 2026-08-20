/**
 * Разведка (этап 1.1 плана функционального тестирования): машинное перечисление
 * исходящих HTTP-запросов КАЖДОГО инструмента реестра.
 *
 * Перехват стоит на adapter axios instance, а не на методах IHttpClient:
 * upload_attachment / download_attachment / get_thumbnail ходят через
 * getAxiosInstance() в обход IHttpClient (см. шапку
 * tests/smoke/tool-params-reach-api.smoke.test.ts) и спаям на IHttpClient не видны.
 */
import { writeFileSync } from 'node:fs';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry, BaseTool } from '@fractalizer/mcp-core';
import { generateReachabilitySample } from '@fractalizer/mcp-core/testing/schema-reachability/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { ServerConfig } from '#config';

const KNOWN_FIELD_SAMPLES = new Map<string, string>([['duration', 'PT1H30M']]);
const KNOWN_REGEX_SAMPLES = new Map<string, string>([
  [/^[A-Z][A-Z0-9]+-\d+$/.source, 'TEST-1'],
  [/^[A-Z][A-Z0-9]+$/.source, 'TESTQ'],
  [/^[A-Z]{2,10}$/.source, 'TESTQ'],
]);

const fakeConfig: ServerConfig = {
  token: 'fake-token-for-testing',
  orgId: 'fake-org-id',
  apiBase: 'https://api.tracker.yandex.net',
  requestTimeout: 5000,
  maxBatchSize: 50,
  maxConcurrentRequests: 10,
  logLevel: 'error',
  prettyLogs: false,
  logsDir: '/tmp/logs',
  logMaxSize: 10485760,
  logMaxFiles: 10,
};

interface Captured {
  tool: string;
  readOnly: boolean;
  destructive: boolean;
  method: string;
  path: string;
  bodyKeys: string[];
  bodyPreview: string;
}

async function main(): Promise<void> {
  const container = await createContainer(fakeConfig);
  const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
  const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
  const axiosInstance = httpClient.getAxiosInstance?.() as {
    defaults: { adapter: unknown };
  };

  const captured: Captured[] = [];
  let current: { tool: string; readOnly: boolean; destructive: boolean } = {
    tool: '?',
    readOnly: false,
    destructive: false,
  };

  axiosInstance.defaults.adapter = async (config: {
    data?: unknown;
    method?: string;
    url?: string;
  }) => {
    const body = config.data;
    let bodyKeys: string[] = [];
    let bodyPreview = '';
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        bodyKeys = Object.keys(parsed as Record<string, unknown>);
      }
      bodyPreview =
        typeof body === 'string' ? body.slice(0, 200) : String(body ?? '').slice(0, 200);
    } catch {
      bodyPreview = '<non-json>';
    }
    captured.push({
      ...current,
      method: String(config.method ?? '?').toUpperCase(),
      path: String(config.url ?? '?'),
      bodyKeys,
      bodyPreview,
    });
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };

  const noRequest: string[] = [];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = ToolClass.METADATA;
    current = {
      tool: metadata.name,
      readOnly: metadata.annotations?.readOnlyHint === true,
      destructive: metadata.annotations?.destructiveHint === true,
    };
    const before = captured.length;
    const tool = registry.getTool(metadata.name);
    if (!tool) {
      noRequest.push(`${metadata.name} — НЕТ В РЕЕСТРЕ`);
      continue;
    }
    const schema = (
      tool as unknown as { getParamsSchema: () => Parameters<typeof generateReachabilitySample>[0] }
    ).getParamsSchema();
    let sample: unknown = {};
    try {
      sample = generateReachabilitySample(schema, {
        knownFieldSamples: KNOWN_FIELD_SAMPLES,
        knownRegexSamples: KNOWN_REGEX_SAMPLES,
      }).value;
    } catch (e) {
      noRequest.push(`${metadata.name} — генератор образца упал: ${(e as Error).message}`);
      continue;
    }
    try {
      await (tool as BaseTool).execute(sample as Record<string, unknown>);
    } catch (e) {
      if (captured.length === before) {
        noRequest.push(`${metadata.name} — запросов нет: ${(e as Error).message.slice(0, 160)}`);
      }
    }
    if (captured.length === before && !noRequest.some((n) => n.startsWith(metadata.name))) {
      noRequest.push(`${metadata.name} — запросов нет (выполнился без HTTP)`);
    }
  }

  const lines: string[] = [];
  lines.push('# Перечисление исходящих HTTP-запросов инструментов Трекера');
  lines.push('');
  lines.push('**Чем получено:** `scripts/enumerate-outgoing-requests.ts` — обход `TOOL_CLASSES`,');
  lines.push('синтетический образец параметров из Zod-схемы, перехват на `axios.defaults.adapter`');
  lines.push('(ловит и обходные пути `getAxiosInstance()`), ответ-заглушка `200 {}`.');
  lines.push('');
  lines.push('**Чего способ НЕ видит:** ветки, требующие правдоподобного ответа сервера (вторая');
  lines.push('страница пагинации, второй запрос после чтения списка); пути, зависящие от значений');
  lines.push(
    'в ответе; инструменты, упавшие на валидации синтетического образца — они перечислены'
  );
  lines.push('отдельным списком ниже и требуют ручного разбора.');
  lines.push('');
  lines.push('| Инструмент | readOnly | destructive | Метод | Путь | Ключи тела |');
  lines.push('|---|:--:|:--:|---|---|---|');
  for (const c of captured) {
    lines.push(
      `| \`${c.tool}\` | ${c.readOnly ? 'да' : 'нет'} | ${c.destructive ? 'да' : 'нет'} | ${c.method} | \`${c.path}\` | ${c.bodyKeys.join(', ') || '—'} |`
    );
  }
  lines.push('');
  lines.push(`## Инструменты без зафиксированного запроса (${noRequest.length})`);
  lines.push('');
  for (const n of noRequest) lines.push(`- ${n}`);
  lines.push('');

  const outPath = process.argv[2] ?? 'outgoing-requests.md';
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  const mutating = captured.filter((c) => c.method !== 'GET');
  process.stdout.write(
    `Инструментов в реестре: ${TOOL_CLASSES.length}\n` +
      `Запросов записано: ${captured.length} (не-GET: ${mutating.length})\n` +
      `Без запроса: ${noRequest.length}\n` +
      `Отчёт: ${outPath}\n`
  );
}

void main();
