/**
 * Smoke Test: достижимость параметров инструмента (пакет 7.1.E плана
 * .agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md,
 * раздел "Пакет 7.1.E").
 *
 * TickTick НЕ был охвачен аудитом пакета 7.1 (7.1.A — Трекер, 7.1.B — Wiki)
 * и своего теста на этот класс дефекта не имел. Механизм проверки —
 * ЕДИНЫЙ во framework (`@fractalizer/mcp-core/testing/schema-reachability`),
 * общий с Трекером и Wiki (см. заголовки их тестов этого же пакета за
 * деталями метода и сведения двух прежних параллельных реализаций). Этот
 * файл — ТОНКАЯ обвязка: DI-контейнер TickTick, обход `TOOL_CLASSES`,
 * список исключений СВОИХ, специфичных для TickTick дефектов формата.
 *
 * МЕТОД: для каждого инструмента реестра генерируется полностью заполненный
 * набор параметров (обязательные и опциональные, включая вложенные), tool
 * выполняется через РЕАЛЬНУЮ DI-цепочку (tool -> facade -> service ->
 * operation) со спаями на все 6 методов `IHttpClient`, и каждый лист образца
 * проверяется на присутствие в сериализованном виде исходящих вызовов.
 *
 * ОБЛАСТЬ ПРОВЕРКИ — ВСЕ инструменты (не только write), как у Wiki: у
 * TickTick, в отличие от Трекера, нет list-эндпоинтов с cross-field
 * refine-ограничением ("cursor несовместим с perPage/fetchAll/maxItems") —
 * проверено grep-ом по схемам всех инструментов перед написанием теста: ни
 * одного межпольного refine на схемах TickTick нет (кроме
 * priority.schema.ts, не связанного с несколькими полями формы). Заполнение
 * ВСЕХ полей образцом генератора поэтому безопасно для всех инструментов.
 *
 * КОНТЕЙНЕР — НОВЫЙ НА КАЖДЫЙ ТЕСТ (не beforeAll с одним контейнером, как у
 * Трекера): CacheManager внутри DI-контейнера TickTick — синглтон
 * контейнера, а генератор строит маркеры ДЕТЕРМИНИРОВАННО по имени поля
 * (одинаковый `projectId`/`taskId` для разных инструментов). При одном общем
 * контейнере на весь файл `GetTaskOperation.withCache()` мог бы отдать
 * закешированный результат ОДНОГО инструмента другому, molчаливо пропустив
 * реальный HTTP-вызов и исказив вывод о достижимости. Разный контейнер на
 * тест стоит дороже по времени, но исключает этот класс ложных срабатываний
 * целиком — то же решение, что и в исходной Wiki-версии этого пакета.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry, BaseTool } from '@fractalizer/mcp-core';
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
 * - RawApiRequestTool — generic escape-hatch фабрики @fractalizer/mcp-core,
 *   та же причина, что у Трекера/Wiki (см. их тесты этого же пакета): путь
 *   запроса — HTTP-запрос как есть, не доменная DTO-модель; фреймворк вне
 *   набора файлов этого пакета; схема накладывает `.refine()`-ограничения
 *   поверх regex, которые публичный `z.toJSONSchema` не выражает.
 *
 * `PingTool` НЕ исключён явно: его схема параметров пуста, генератор не
 * производит ни одного листа — проверка тривиально проходит.
 */
const EXCLUDED_TOOLS = new Set(['RawApiRequestTool']);

/**
 * `priority` ограничен `.refine(v => [0,1,3,5].includes(v))`
 * (`#common/schemas/priority.schema.ts`) — множество, которое публичный
 * `z.toJSONSchema` не выражает (refine непрозрачен для JSON Schema).
 * Без этой записи generic-генератор выдал бы произвольное число, которое
 * `validateParams()` отклонил бы ДО HTTP-вызова, дав ложные "недостижимо"
 * для ВСЕХ полей инструмента (не только priority) — воспроизведено
 * эмпирически на CreateTaskTool/UpdateTaskTool/BatchCreateTasksTool.
 */
const KNOWN_FIELD_SAMPLES = new Map<string, string | number>([['priority', 3]]);

/**
 * Глобальные исключения полей — клиентские, не отправляются в API ни одним
 * инструментом. `fields[]` — путь листа: `FieldsSchema` (#tools/shared) —
 * `z.array(z.string())`, листья генератора — элементы массива.
 */
const GLOBAL_EXCEPTIONS: readonly ReachabilityException[] = [
  {
    path: 'fields[]',
    reason: 'клиентская фильтрация ответа (ResponseFieldFilter), в API не отправляется',
  },
];

/**
 * Исключения по конкретным инструментам.
 *
 * ЧЕТЫРЕ ЗАПИСИ — ЛЕГИТИМНЫЕ клиентские фильтры: TickTick Open API v1 не
 * предоставляет server-side query для статуса/приоритета/подстроки/диапазона
 * дат — `TickTickFacade` реализует их как `getAllTasks()` + локальный
 * `.filter()` (см. facade.ts: `searchTasks`, `getTasksByPriority`,
 * `getTasksDueInRange`/`getTasksDueInDays`, и статус-фильтр в
 * `GetAllTasksTool.execute()`). Параметр валиден и используется, просто не
 * долетает до API 1:1 — не тот класс дефекта, который ищет этот тест.
 *
 * ОДНА ЗАПИСЬ — ПОДТВЕРЖДЁННЫЙ ДЕФЕКТ (НЕ чинится в этом пакете, см. отчёт
 * пакета 7.1.E, раздел "Находки у TickTick"): `fr_ticktick_complete_task`.
 */
const EXCEPTIONS_BY_TOOL: Record<string, readonly ReachabilityException[]> = {
  fr_ticktick_get_all_tasks: [
    {
      path: 'status',
      reason:
        'клиентский фильтр: getAllTasks() + локальный .filter() по статусу, API не поддерживает server-side',
    },
  ],
  fr_ticktick_search_tasks: [
    {
      path: 'query',
      reason:
        'клиентский фильтр: getAllTasks() + localeCompare-поиск по title/content/desc в facade.searchTasks()',
    },
  ],
  fr_ticktick_get_tasks_by_priority: [
    {
      path: 'priority',
      reason:
        'клиентский фильтр: getAllTasks() + локальный .filter(task.priority === priority) в facade',
    },
  ],
  fr_ticktick_get_tasks_due_in_days: [
    {
      path: 'days',
      reason:
        'клиентский фильтр: days только вычисляет диапазон дат локально (facade.getTasksDueInDays → getTasksDueInRange), API его не видит',
    },
  ],
  fr_ticktick_complete_task: [
    {
      path: 'projectId',
      reason:
        'ДЕФЕКТ (не чинится в этом пакете — предметная область TickTick, см. отчёт 7.1.E "Находки у TickTick"): ' +
        'CompleteTaskOperation шлёт POST /task/{taskId}/complete БЕЗ projectId в пути, в отличие от ' +
        'GetTaskOperation/UpdateTaskOperation (оба используют /project/{projectId}/task/{taskId}...) — ' +
        'complete-task.operation.ts, метод execute().',
    },
  ],
};

const fakeConfig: ServerConfig = {
  oauth: {
    clientId: 'fake-client-id',
    clientSecret: 'fake-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  },
  api: {
    baseUrl: 'https://api.ticktick.com/open/v1',
  },
  batch: {
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
  },
  retry: {
    attempts: 3,
    minDelay: 1000,
    maxDelay: 10000,
  },
  cache: {
    ttlMs: 300000,
  },
  tools: {},
  logging: {
    level: 'error',
    dir: './logs',
    prettyLogs: false,
    maxSize: 51200,
    maxFiles: 20,
  },
  requestTimeout: 30000,
};

describe('Tool Params Reach API (Smoke) — обход реестра инструментов TickTick', () => {
  let activeRecorder: HttpClientCallRecorder | undefined;

  afterEach(() => {
    activeRecorder?.restore();
    activeRecorder = undefined;
  });

  const checkedToolClasses = TOOL_CLASSES.filter(
    (ToolClass) => !EXCLUDED_TOOLS.has(ToolClass.name)
  );

  // Граничное условие: список проверяемых инструментов не должен внезапно опустеть.
  it('находит инструменты для проверки', () => {
    expect(checkedToolClasses.length).toBeGreaterThan(20);
  });

  checkedToolClasses.forEach((ToolClass) => {
    const toolName = ToolClass.METADATA.name;

    it(`${ToolClass.name} (${toolName}): каждое поле схемы доезжает до HTTP-запроса`, async () => {
      const container = await createContainer(fakeConfig);
      const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
      const recorder = createHttpClientCallRecorder(httpClient);
      activeRecorder = recorder;

      const tool = toolRegistry.getTool(toolName);
      expect(tool, `Инструмент "${toolName}" не найден в ToolRegistry`).toBeDefined();

      const schema = (
        tool as unknown as {
          getParamsSchema: () => Parameters<typeof generateReachabilitySample>[0];
        }
      ).getParamsSchema();

      const { value, leaves } = generateReachabilitySample(schema, {
        knownFieldSamples: KNOWN_FIELD_SAMPLES,
      });

      try {
        await (tool as BaseTool).execute(value as Record<string, unknown>);
      } catch {
        // Инструмент мог упасть при обработке фиктивного ответа мока — не важно,
        // нас интересует только факт исходящего HTTP-вызова (записан ДО throw).
      }

      const exceptions = [...GLOBAL_EXCEPTIONS, ...(EXCEPTIONS_BY_TOOL[toolName] ?? [])];
      const unreachable = findUnreachableLeaves(recorder.haystack(), leaves, exceptions);

      expect(
        unreachable,
        unreachable.map((u) => describeUnreachableLeaf(toolName, u)).join('\n')
      ).toHaveLength(0);
    });
  });
});
