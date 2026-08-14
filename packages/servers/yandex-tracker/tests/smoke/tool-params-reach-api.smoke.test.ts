/**
 * Smoke Test (пакет 7.1.A плана .agentic-planning/plan_mcp_2026_modernization/
 * 7.1_api_defects_parallel.md): "ни один инструмент Трекера не принимает параметр,
 * который не доезжает до API".
 *
 * КОНТЕКСТ: три из четырёх дефектов пакета 7.1.A — это ровно этот класс бага
 * (параметр объявлен в Zod-схеме инструмента, но операция его никуда не отправляет).
 * Wiki-сервер (пакет 7.1.B) независимо наткнулся на тот же класс дефекта в
 * `create_page` (is_silent/fields). Разовая починка четырёх находок не защищает от
 * пятой — этот тест обходит РЕЕСТР инструментов (TOOL_CLASSES), а не список из
 * четырёх известных имён, и для каждого write-инструмента:
 *
 * 1. Генерирует полностью заполненный набор параметров (см.
 *    tests/helpers/schema-sample-generator.ts) — уникальный маркер на каждое
 *    строковое/числовое/enum/literal поле схемы, включая вложенные (batch-элементы,
 *    объекты вроде `values`).
 * 2. Вызывает инструмент через РЕАЛЬНУЮ DI-цепочку (tool -> facade -> service ->
 *    operation), со шпионами на все методы IHttpClient.
 * 3. Проверяет, что маркер каждого поля НАЙДЕН в сериализованном виде
 *    исходящих HTTP-вызовов (path + body) — то есть поле реально ушло на сервер,
 *    а не было потеряно на одном из промежуточных слоёв.
 *
 * Инструмент может бросить исключение ПОСЛЕ похода в HttpClient (например, при
 * обработке фиктивного ответа mock'а) — это игнорируется: нас интересует только
 * факт исходящего вызова, а не корректная обработка ответа.
 *
 * ИСКЛЮЧЕНИЯ (документированы, не расширять без причины):
 * - upload_attachment: загрузка идёт через BaseOperation.uploadFile(), который
 *   берёт axios instance напрямую (getAxiosInstance()) и отправляет multipart
 *   FormData в обход стандартных методов IHttpClient — шпионы на get/post/patch/
 *   delete этот вызов не видят. Нужна отдельная, специализированная проверка
 *   (не обходом реестра); вне рамок этого пакета.
 * - download_attachment / get_thumbnail: `attachmentId` используется ТОЛЬКО клиентской
 *   фильтрацией списка (`attachments.find(a => a.id === attachmentId)`) и в URL
 *   финального `downloadFile()` — оба пути не видны спаям (список не фильтруется на
 *   сервере по attachmentId, а downloadFile идёт в обход IHttpClient напрямую через
 *   axios). Реальная отправка attachmentId на сервер физически не проходит через
 *   инструментированные методы, поэтому инструмент исключён целиком, а не помечен
 *   точечным исключением параметра.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry, BaseTool } from '@fractalizer/mcp-core';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { ServerConfig } from '#config';
import { generateSample } from '../helpers/schema-sample-generator.js';

/**
 * Инструменты, которые физически не могут быть покрыты обходом IHttpClient —
 * см. блок "ИСКЛЮЧЕНИЯ" в шапке файла. Ключ — METADATA.name (без префикса).
 */
const EXCLUDED_TOOLS = new Set<string>([
  'upload_attachment',
  'download_attachment',
  'get_thumbnail',
]);

function isExcludedTool(metadataName: string): boolean {
  return Array.from(EXCLUDED_TOOLS).some((short) => metadataName.endsWith(`_${short}`));
}

/**
 * Пути полей (в нотации генератора: `key`, `key[]`, `key.nested`), которые
 * заведомо НЕ должны доезжать до API 1:1 — это client-side control параметры:
 * `fields`/`fields[]` — фильтрация ответа на нашей стороне (ResponseFieldFilter),
 * в API не отправляется никогда, по контракту всего сервера (см. корневой
 * CLAUDE.md, "Фильтрация полей").
 */
const GLOBALLY_EXCLUDED_LEAF_PREFIXES = ['fields'];

function isExcludedLeaf(path: string): boolean {
  return GLOBALLY_EXCLUDED_LEAF_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`)
  );
}

interface HttpSpies {
  readonly get: MockInstance;
  readonly post: MockInstance;
  readonly patch: MockInstance;
  readonly delete: MockInstance;
  readonly getWithResponse: MockInstance;
  readonly postWithResponse: MockInstance;
}

function collectHaystack(spies: HttpSpies): string {
  const allCalls = [
    ...spies.get.mock.calls,
    ...spies.post.mock.calls,
    ...spies.patch.mock.calls,
    ...spies.delete.mock.calls,
    ...spies.getWithResponse.mock.calls,
    ...spies.postWithResponse.mock.calls,
  ];
  return JSON.stringify(allCalls);
}

function clearSpies(spies: HttpSpies): void {
  spies.get.mockClear();
  spies.post.mockClear();
  spies.patch.mockClear();
  spies.delete.mockClear();
  spies.getWithResponse.mockClear();
  spies.postWithResponse.mockClear();
}

describe('Tool Params Reach API (Smoke) — обход реестра инструментов', () => {
  const fakeConfig: ServerConfig = {
    token: 'fake-token-for-testing',
    orgId: 'fake-org-id',
    apiBase: 'https://api.tracker.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error',
    prettyLogs: false,
  };

  let toolRegistry: ToolRegistry;
  let httpClient: IHttpClient;
  let spies: HttpSpies;

  beforeAll(async () => {
    const container = await createContainer(fakeConfig);
    toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    httpClient = container.get<IHttpClient>(TYPES.HttpClient);

    spies = {
      get: vi.spyOn(httpClient, 'get').mockResolvedValue({}),
      post: vi.spyOn(httpClient, 'post').mockResolvedValue({}),
      patch: vi.spyOn(httpClient, 'patch').mockResolvedValue({}),
      delete: vi.spyOn(httpClient, 'delete').mockResolvedValue(undefined),
      getWithResponse: vi
        .spyOn(httpClient, 'getWithResponse')
        .mockResolvedValue({ data: {}, headers: {} }),
      postWithResponse: vi
        .spyOn(httpClient, 'postWithResponse')
        .mockResolvedValue({ data: {}, headers: {} }),
    };
  });

  afterEach(() => {
    clearSpies(spies);
  });

  const writeToolClasses = TOOL_CLASSES.filter((ToolClass) => {
    const metadata = ToolClass.METADATA;
    return metadata.annotations?.readOnlyHint === false && !isExcludedTool(metadata.name);
  });

  // Граничное условие: список write-инструментов не должен внезапно опустеть
  // (например, из-за опечатки в фильтре) — тест сам себя проверяет.
  it('находит хотя бы один write-инструмент для проверки', () => {
    expect(writeToolClasses.length).toBeGreaterThan(10);
  });

  writeToolClasses.forEach((ToolClass) => {
    const toolName = ToolClass.METADATA.name;

    it(`${ToolClass.name} (${toolName}): каждое поле схемы доезжает до HTTP-запроса`, async () => {
      const tool = toolRegistry.getTool(toolName);
      expect(tool, `Инструмент "${toolName}" не найден в ToolRegistry`).toBeDefined();

      // getParamsSchema() объявлен protected на BaseTool — обходим TS-барьер намеренно,
      // это тестовая рефлексия, а не продовый код (protected не существует в рантайме JS).
      const schema = (tool as unknown as { getParamsSchema: () => unknown }).getParamsSchema();

      const { value, leaves } = generateSample(schema);

      clearSpies(spies);
      try {
        await (tool as BaseTool).execute(value as Record<string, unknown>);
      } catch {
        // Инструмент мог упасть при обработке фиктивного ответа mock'а — не важно,
        // нас интересует только факт исходящего HTTP-вызова (записан спаями ДО throw).
      }

      const haystack = collectHaystack(spies);

      for (const [path, leaf] of leaves) {
        if (isExcludedLeaf(path)) continue;

        const found =
          leaf.kind === 'boolean'
            ? haystack.includes(`"${leaf.fieldName}":true`) ||
              haystack.includes(`${leaf.fieldName}=true`)
            : haystack.includes(leaf.value);

        const leafDescription =
          leaf.kind === 'boolean' ? `boolean, имя "${leaf.fieldName}"` : `значение "${leaf.value}"`;

        expect(
          found,
          `Поле "${path}" (${leafDescription}) ` +
            `инструмента "${toolName}" не найдено ни в одном исходящем HTTP-вызове (path/body/query) — ` +
            'похоже, схема объявляет параметр, который операция не отправляет в API. Если это ложное ' +
            'срабатывание (поле легитимно не форвардится 1:1), добавь путь в ' +
            'GLOBALLY_EXCLUDED_LEAF_PREFIXES с обоснованием.'
        ).toBe(true);
      }
    });
  });
});
