/**
 * Smoke Test: достижимость поля схемы (пакет 7.1.B плана
 * .agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md,
 * DoD п.2; сведено во framework пакетом 7.1.E — см.
 * `.agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md`,
 * раздел "Пакет 7.1.E").
 *
 * Это тест именно того класса дефектов, который уже дважды всплыл
 * независимо в этом проекте (create_page терял is_silent/fields — пакет
 * 7.1.B №1; delete_page не поддерживал allow_recursive/recursive — №4):
 * поле объявлено в Zod-схеме инструмента, доходит до валидации, но
 * ОПЕРАЦИЯ его не пересылает в HTTP-запрос.
 *
 * Генератор образцов и проверка достижимости — теперь ЕДИНЫЙ механизм во
 * framework (`@fractalizer/mcp-core/testing/schema-reachability`), общий с
 * Трекером и TickTick. Этот файл — только ТОНКАЯ обвязка: DI-контейнер
 * Wiki, обход `TOOL_CLASSES`, и список исключений СВОИХ дефектов формата.
 *
 * ПОЧТИ СНЯТ МЕХАНИЗМ "ПЕРЕИМЕНОВАННЫХ ПОЛЕЙ" (RENAMED_FIELDS прежней
 * версии): сведённая проверка сопоставляет SCALAR-лист ПО ЗНАЧЕНИЮ
 * (уникальному маркеру), а не по имени JSON-ключа — если операция форвардит
 * значение поля 1:1 под другим именем ключа (например, `body_location`
 * схемы → `{ location: body_location }` DTO), маркер-значение всё равно
 * находится в теле запроса. Проверено эмпирически прогоном этого теста
 * после сведения — 4 из 6 прежних случаев RENAMED_FIELDS (`body_location`,
 * `section_id`, `section_location`, `page_id`/`page_slug`) действительно
 * оказались лишними. ОСТАЛИСЬ НУЖНЫ только для BOOLEAN-листьев
 * (`anchor_fallback`/`anchor_regex` → `{ anchor: { fallback, regex } }`) —
 * boolean матчится ПАРОЙ "имя+значение" (см. `find-unreachable-leaves.ts`),
 * поэтому переименование ключа на wire всё же ломает совпадение; framework
 * поддерживает это через `wireFieldName` в `ReachabilityException` (см.
 * `EXCEPTIONS_BY_TOOL['yw_append_content']` ниже).
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import {
  generateReachabilitySample,
  findUnreachableLeaves,
  describeUnreachableLeaf,
  createHttpClientCallRecorder,
} from '@fractalizer/mcp-core/testing/schema-reachability/index.js';
import type {
  ReachabilityException,
  HttpClientCallRecorder,
} from '@fractalizer/mcp-core/testing/schema-reachability/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { ServerConfig } from '#config';

/**
 * Инструменты вне общей проверки:
 * - PingTool — без параметров (пустая схема — leaves пуст, но исключаем
 *   явно ради читаемости отчёта, как и в прежней версии).
 * - RawApiRequestTool — generic escape-hatch фабрики @fractalizer/mcp-core
 *   (та же причина, что и у Трекера/TickTick — см. их файлы этого же
 *   пакета 7.1.E): путь запроса — HTTP-запрос как есть, не доменная
 *   DTO-модель; фреймворк вне набора файлов этого пакета; схема накладывает
 *   `.refine()`-ограничения на путь поверх regex, которые публичный
 *   `z.toJSONSchema` не выражает.
 */
const EXCLUDED_TOOLS = new Set(['PingTool', 'RawApiRequestTool']);

/**
 * Поля, которые НЕ обязаны достигать HTTP-запроса — осознанно клиентские:
 * - responseFields (yw_get_page) — локальная фильтрация НАШЕГО ответа
 *   (ResponseFieldFilter), к Wiki API отношения не имеет.
 * - newContent (yw_diff_page) — сравнивается локально с уже прочитанным
 *   содержимым, документировано в схеме как "не сохраняется".
 */
const EXCEPTIONS_BY_TOOL: Record<string, readonly ReachabilityException[]> = {
  yw_get_page: [
    {
      path: 'responseFields[]',
      reason: 'локальная фильтрация ответа (ResponseFieldFilter), к Wiki API отношения не имеет',
    },
  ],
  yw_diff_page: [
    {
      path: 'newContent',
      reason: 'сравнивается локально с уже прочитанным содержимым, в API не отправляется',
    },
  ],
  yw_get_resources: [
    {
      path: 'responseMode',
      reason:
        'управляет ТОЛЬКО формой ответа инструмента (BaseTool.formatCollectionResult) — ' +
        'links/full/auto, к запросу Wiki API отношения не имеет (пакет 5.1.C.wiki)',
    },
  ],
  // Boolean-листья форвардятся 1:1 по значению, но под ДРУГИМ именем ключа
  // (append-content.tool.ts: `data.anchor = { fallback: anchor_fallback,
  // regex: anchor_regex }`) — см. заголовок файла про wireFieldName.
  yw_append_content: [
    {
      path: 'anchor_fallback',
      wireFieldName: 'fallback',
      reason: 'форвардится 1:1 во вложенный DTO data.anchor.fallback (другое имя ключа на wire)',
    },
    {
      path: 'anchor_regex',
      wireFieldName: 'regex',
      reason: 'форвардится 1:1 во вложенный DTO data.anchor.regex (другое имя ключа на wire)',
    },
  ],
};

const fakeConfig: ServerConfig = {
  token: 'OAuth fake-token',
  orgId: 'fake-org',
  apiBase: 'https://api.wiki.yandex.net',
  requestTimeout: 30000,
  maxBatchSize: 50,
  maxConcurrentRequests: 10,
  logLevel: 'error',
  prettyLogs: false,
  logsDir: '/tmp/logs',
  logMaxSize: 10485760,
  logMaxFiles: 5,
  retryAttempts: 3,
  retryMinDelay: 1000,
  retryMaxDelay: 10000,
};

describe('Schema → Wire Reachability (Smoke) — пакет 7.1.B DoD п.2 / 7.1.E', () => {
  let toolRegistry: ToolRegistry;
  let httpClient: IHttpClient;
  let recorder: HttpClientCallRecorder;

  beforeAll(async () => {
    const container = await createContainer(fakeConfig);
    toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    httpClient = container.get<IHttpClient>(TYPES.HttpClient);
    recorder = createHttpClientCallRecorder(httpClient);

    const missing = TOOL_CLASSES.filter(
      (ToolClass) => !EXCLUDED_TOOLS.has(ToolClass.name) && !ToolClass.METADATA?.name
    );
    expect(missing, 'Инструмент без METADATA.name — тест не может его проверить').toHaveLength(0);
  });

  afterEach(() => {
    recorder.clear();
  });

  TOOL_CLASSES.forEach((ToolClass) => {
    if (EXCLUDED_TOOLS.has(ToolClass.name)) {
      return;
    }

    it(`${ToolClass.METADATA.name}: каждое поле схемы доезжает до HTTP-запроса`, async () => {
      const tool = toolRegistry.getTool(ToolClass.METADATA.name);
      expect(tool, `${ToolClass.METADATA.name} не найден в ToolRegistry`).toBeDefined();

      const schema = (
        tool as unknown as {
          getParamsSchema?: () => Parameters<typeof generateReachabilitySample>[0];
        }
      ).getParamsSchema?.();
      expect(schema, `${ToolClass.name}: getParamsSchema() не определён`).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const definedSchema = schema!;

      const { value, leaves } = generateReachabilitySample(definedSchema);

      recorder.clear();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await tool!.execute(value as Record<string, unknown>);
      expect(result.isError, `Вызов упал: ${JSON.stringify(result)}`).toBeFalsy();

      const exceptions = EXCEPTIONS_BY_TOOL[ToolClass.METADATA.name] ?? [];
      const unreachable = findUnreachableLeaves(recorder.haystack(), leaves, exceptions);

      expect(
        unreachable,
        unreachable.map((u) => describeUnreachableLeaf(ToolClass.METADATA.name, u)).join('\n')
      ).toHaveLength(0);
    });
  });
});
