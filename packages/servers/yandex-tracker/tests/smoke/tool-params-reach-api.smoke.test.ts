/**
 * Smoke Test (пакет 7.1.A плана .agentic-planning/plan_mcp_2026_modernization/
 * 7.1_api_defects_parallel.md; сведено во framework пакетом 7.1.E — см.
 * `.agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md`,
 * раздел "Пакет 7.1.E"): "ни один инструмент Трекера не принимает параметр,
 * который не доезжает до API".
 *
 * Генератор образцов и проверка достижимости — теперь ЕДИНЫЙ механизм во
 * framework (`@fractalizer/mcp-core/testing/schema-reachability`), общий с
 * Wiki и TickTick (см. заголовки файлов там за деталями сведения двух
 * прежних параллельных реализаций). Этот файл — только ТОНКАЯ обвязка:
 * DI-контейнер Трекера, обход `TOOL_CLASSES`, и список исключений СВОИХ,
 * специфичных для Трекера дефектов формата (каждое — с причиной).
 *
 * МЕТОД: для каждого инструмента реестра генерируется полностью заполненный
 * набор параметров (обязательные и опциональные, включая вложенные), tool
 * выполняется через РЕАЛЬНУЮ DI-цепочку (tool -> facade -> service ->
 * operation) со спаями на все 6 методов `IHttpClient`, и каждый лист образца
 * проверяется на присутствие в сериализованном виде исходящих вызовов.
 *
 * ИСКЛЮЧЕНИЯ ЦЕЛЫХ ИНСТРУМЕНТОВ (документированы, не расширять без причины):
 * - upload_attachment: загрузка идёт через BaseOperation.uploadFile(), который
 *   берёт axios instance напрямую (getAxiosInstance()) и отправляет multipart
 *   FormData в обход стандартных методов IHttpClient — спаи на get/post/patch/
 *   delete этот вызов не видят. Нужна отдельная, специализированная проверка
 *   (не обходом реестра); вне рамок этого пакета.
 * - download_attachment / get_thumbnail: `attachmentId` используется ТОЛЬКО клиентской
 *   фильтрацией списка (`attachments.find(a => a.id === attachmentId)`) и в URL
 *   финального `downloadFile()` — оба пути не видны спаям (список не фильтруется на
 *   сервере по attachmentId, а downloadFile идёт в обход IHttpClient напрямую через
 *   axios). Реальная отправка attachmentId на сервер физически не проходит через
 *   инструментированные методы, поэтому инструмент исключён целиком, а не помечен
 *   точечным исключением параметра.
 * - raw_api_request: generic escape-hatch фабрики @fractalizer/mcp-core
 *   (createRawApiRequestSchema) — путь запроса ЯВЛЯЕТСЯ HTTP-запросом как есть,
 *   а не доменной DTO-моделью, у которой поле может "потеряться" между операцией
 *   и httpClient; сам фреймворк вне набора файлов этого пакета (framework
 *   исполнителям сервера запрещён). Кроме того, схема накладывает `.refine()`
 *   ограничения на путь (запрет `//`, `..`) поверх regex — генератор образцов
 *   их не видит (публичный `z.toJSONSchema` не выражает произвольный `.refine`),
 *   так что синтетический образец рисковал бы не пройти собственную валидацию
 *   инструмента ДО похода в HTTP, что дало бы ложный "недостижимый" вердикт.
 *
 * `PingTool` НЕ исключён явно: его схема параметров пуста (`z.object({})`),
 * генератор не производит ни одного листа, поэтому проверка для него
 * тривиально проходит без специального случая.
 *
 * ОБЛАСТЬ ПРОВЕРКИ — только WRITE-инструменты (`readOnlyHint === false`), как
 * и в исходной версии пакета 7.1.A. НЕ расширено на все инструменты (в
 * отличие от Wiki/TickTick — см. их тесты этого же пакета 7.1.E): у Трекера
 * ~10 list-эндпоинтов пагинируются единообразно через `.refine(noCursorWithBulkParams)`
 * (см. `#common/schemas/index.js`, корневой CLAUDE.md раздел "Пагинация
 * list-эндпоинтов") — `cursor` взаимоисключим с `perPage`/`fetchAll`/
 * `maxItems`/`maxTotalItems` на уровне СХЕМЫ, а не одного поля. Генератор
 * образцов (как прежний, так и сведённый) заполняет ВСЕ поля одновременно и
 * не моделирует межпольные `.refine()` — на такой схеме `validateParams()`
 * отклонил бы образец ДО похода в HTTP, дав десяток ложных "недостижимо" для
 * КАЖДОГО list-эндпоинта. Это не дефект пагинации (она инвариантно
 * протестирована отдельно — `tests/README.md`, раздел про cursor), а
 * несовместимость подхода "заполнить всё" с ЭТИМ конкретным паттерном схемы.
 * Проверено эмпирически: на полном наборе инструментов `find_issues` дал
 * ровно такую картину (11 "недостижимых" полей, включая `cursor` и `perPage`
 * одновременно) — сужение обратно до write-инструментов подтверждено как
 * причина, а не гипотеза.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
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
 * Инструменты, физически не покрываемые обходом IHttpClient — см. шапку
 * файла. `raw_api_request` тоже здесь (не отдельной проверкой имени): и
 * `EXCLUDED_TOOLS`, и весь фильтр `checkedToolClasses` ниже сравнивают
 * `METADATA.name`, который включает префикс сервера (`buildToolName()`) —
 * `metadata.name !== 'raw_api_request'` был бы всегда true и НИКОГДА не
 * сработал бы. На практике это было безвредно (raw_api_request — read-only,
 * readOnlyHint исключает его раньше), но исправлено на верный
 * suffix-паттерн, чтобы не полагаться на побочный эффект другого фильтра.
 */
const EXCLUDED_TOOLS = new Set<string>([
  'upload_attachment',
  'download_attachment',
  'get_thumbnail',
  'raw_api_request',
]);

function isExcludedTool(metadataName: string): boolean {
  return Array.from(EXCLUDED_TOOLS).some((short) => metadataName.endsWith(`_${short}`));
}

/**
 * Поля, которые заведомо НЕ должны доезжать до API 1:1 — client-side control
 * параметры. `fields`/`fields[]` — фильтрация ответа на нашей стороне
 * (ResponseFieldFilter), в API не отправляется никогда, по контракту всего
 * сервера (см. корневой CLAUDE.md, "Фильтрация полей"). Путь `fields[]`, а не
 * `fields` — `FieldsSchema` (`#common/schemas/fields.schema.ts`) это
 * `z.array(z.string())`, листья генератора — элементы массива.
 */
const GLOBAL_EXCEPTIONS: readonly ReachabilityException[] = [
  {
    path: 'fields[]',
    reason: 'клиентская фильтрация ответа (ResponseFieldFilter), в API не отправляется',
  },
];

/**
 * `duration` (add_worklog/update_worklog): `AddWorklogOperation`/
 * `UpdateWorklogOperation` пропускают уже-ISO8601 значения без изменений, но
 * человекочитаемые конвертируют перед отправкой — произвольный маркер не
 * совпал бы с отправленным значением. Нужен ЗАВЕДОМО валидный ISO8601-формат.
 */
const KNOWN_FIELD_SAMPLES = new Map<string, string>([['duration', 'PT1H30M']]);

/** Regex-паттерны схем Трекера, для которых генератору нужен явный образец. */
const KNOWN_REGEX_SAMPLES = new Map<string, string>([
  [/^[A-Z][A-Z0-9]+-\d+$/.source, 'TEST-1'], // IssueKeySchema и локальные копии
  [/^[A-Z][A-Z0-9]+$/.source, 'TESTQ'], // ключ очереди (bulk-move/bulk-update)
  [/^[A-Z]{2,10}$/.source, 'TESTQ'], // ключ очереди (create-queue)
]);

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
    logsDir: '/tmp/logs',
    logMaxSize: 10485760,
    logMaxFiles: 10,
  };

  let toolRegistry: ToolRegistry;
  let httpClient: IHttpClient;
  let recorder: HttpClientCallRecorder;

  beforeAll(async () => {
    const container = await createContainer(fakeConfig);
    toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    httpClient = container.get<IHttpClient>(TYPES.HttpClient);
    recorder = createHttpClientCallRecorder(httpClient);
  });

  afterEach(() => {
    recorder.clear();
  });

  const checkedToolClasses = TOOL_CLASSES.filter((ToolClass) => {
    const metadata = ToolClass.METADATA;
    return metadata.annotations?.readOnlyHint === false && !isExcludedTool(metadata.name);
  });

  // Граничное условие: список write-инструментов не должен внезапно опустеть
  // (например, из-за опечатки в фильтре) — тест сам себя проверяет.
  it('находит хотя бы один write-инструмент для проверки', () => {
    expect(checkedToolClasses.length).toBeGreaterThan(10);
  });

  checkedToolClasses.forEach((ToolClass) => {
    const toolName = ToolClass.METADATA.name;

    it(`${ToolClass.name} (${toolName}): каждое поле схемы доезжает до HTTP-запроса`, async () => {
      const tool = toolRegistry.getTool(toolName);
      expect(tool, `Инструмент "${toolName}" не найден в ToolRegistry`).toBeDefined();

      // getParamsSchema() объявлен protected на BaseTool — обходим TS-барьер намеренно,
      // это тестовая рефлексия, а не продовый код (protected не существует в рантайме JS).
      const schema = (
        tool as unknown as {
          getParamsSchema: () => Parameters<typeof generateReachabilitySample>[0];
        }
      ).getParamsSchema();

      const { value, leaves } = generateReachabilitySample(schema, {
        knownFieldSamples: KNOWN_FIELD_SAMPLES,
        knownRegexSamples: KNOWN_REGEX_SAMPLES,
      });

      recorder.clear();
      try {
        await (tool as BaseTool).execute(value as Record<string, unknown>);
      } catch {
        // Инструмент мог упасть при обработке фиктивного ответа мока — не важно,
        // нас интересует только факт исходящего HTTP-вызова (записан ДО throw).
      }

      const unreachable = findUnreachableLeaves(recorder.calls(), leaves, GLOBAL_EXCEPTIONS);

      expect(
        unreachable,
        unreachable.map((u) => describeUnreachableLeaf(toolName, u)).join('\n')
      ).toHaveLength(0);
    });
  });
});
