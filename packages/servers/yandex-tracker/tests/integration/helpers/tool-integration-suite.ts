/**
 * Фабрика обязательного состава интеграционного теста инструмента —
 * `describeToolIntegration`.
 *
 * Почему фабрика, а не конвенция в комментариях: план
 * `.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`
 * §0 (редакция 2→3) отверг конвейер свидетельств (запись на каждый вызов + скрипт,
 * читающий записи) — это тащит грабли устаревшего производного артефакта (урок 8.1
 * канона, `packages/servers/TESTING_STRATEGY.md`). Вместо этого обязательный состав
 * кейсов принуждается ТИПАМИ: поле, не указанное в `ToolIntegrationOptions`, — ошибка
 * компиляции, а не расхождение отчёта с фактом. Барьер — `npm run typecheck:tests`,
 * не эта фабрика сама по себе.
 *
 * Что фабрика порождает сама (свойства С-2/С-3/С-4/С-6 канона):
 * - happy path — сверяется с `outputSchema` через `successEnvelopeSchema`, на ОБЕИХ
 *   проекциях ответа (`structuredContent` и `content[0].text`), без `warnings`;
 * - невалидный вход — отклоняется ДО HTTP-запроса (проверяется `attemptedCount`,
 *   а не только `isError`, иначе ложный порядок-виолейшен маскируется под успешный
 *   тест валидации — см. `ApiExpectationSet.attemptedCount`);
 * - 403 и 404 — маппятся в контрактную ошибку;
 * - batch (если применим) — смешанный исход, обе группы, идентификатор в каждом
 *   элементе;
 * - пагинация (если применима) — тип постранички именно этого эндпоинта; полная
 *   страница ⇒ `hasNextPage=true`, неполная ⇒ `false` (регрессия С-6, см.
 *   `tests/TESTING_STRATEGY.md` §3).
 *
 * Особенное (многоступенчатые потоки: `download_attachment`, `get_thumbnail`,
 * `delete_component`, `transition_issue`) в эту фабрику не укладывается и не должно —
 * пишется обычными `it()` рядом, напрямую на `ApiExpectationSet` (план §A).
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import type { z } from 'zod';
import { createTestClient } from './mcp-client.js';
import type { TestMCPClient, ToolExecutionResult } from './mcp-client.js';
import {
  ApiExpectationSet,
  assertConsumedRequestsDeclared,
  sameEndpoint,
} from './api-expectation.js';
import type { ExpectedRequestSpec } from './api-expectation.js';
import { successEnvelopeSchema } from '#common/schemas/index.js';

/**
 * Сообщение `formatValidationError` (`@fractalizer/mcp-core`,
 * `src/tools/base/base-tool.ts`) — единственный устойчивый машинный сигнал, что
 * отказ был именно валидацией входа, а не какой-то другой ранней ошибкой (L-1,
 * найдено ревью пакета): голый `isError` засчитывает любой отказ до HTTP.
 */
const VALIDATION_ERROR_MESSAGE = 'Ошибка валидации параметров';

/** Достаёт `structuredContent` из результата инструмента без `any`. */
function getStructuredContent(result: ToolExecutionResult): unknown {
  return result['structuredContent'];
}

function isTextBlock(block: unknown): block is { type: 'text'; text: string } {
  return (
    typeof block === 'object' &&
    block !== null &&
    'type' in block &&
    (block as { type: unknown }).type === 'text' &&
    'text' in block &&
    typeof (block as { text: unknown }).text === 'string'
  );
}

/** Текст `content[0]`, брошенный при отсутствии текстового блока. */
function getTextContent(result: ToolExecutionResult): string {
  const block = result.content[0];
  if (!isTextBlock(block)) {
    throw new Error(`content[0] не является текстовым блоком: ${JSON.stringify(block)}`);
  }
  return block.text;
}

/**
 * Готовый контекст (`client`+`api`) для многоступенчатых кейсов
 * (`delete_component`: GET→DELETE, `download_attachment`/`get_thumbnail`: вторая
 * ступень по значениям первого ответа, `transition_issue`: `_execute`→GET), которые
 * не укладываются в `describeToolIntegration` и пишутся обычными `it()` рядом
 * (план §A). Возвращаемые поля — геттеры, а не снимок: значение актуально только
 * ПОСЛЕ того, как отработал `beforeEach`, то есть внутри `it()`/`afterEach`, не в
 * теле `describe()` (M-5, найдено ревью пакета).
 */
export interface ToolIntegrationContext {
  readonly client: TestMCPClient;
  readonly api: ApiExpectationSet;
}

/**
 * Регистрирует `beforeEach`/`afterEach` внутри уже открытого `describe()` блока —
 * та же связка, что использует `describeToolIntegration` внутри себя. Гарантирует
 * `retryAttempts: 0` (см. шапку `api-expectation.ts`: незаявленный запрос под
 * дефолтным `retryAttempts` ретраится ~7s вместо мгновенного отказа) — до этого
 * авторам особенных многоступенчатых кейсов приходилось заводить свой
 * `beforeEach(createTestClient(...))` и часть забывала это значение (M-5).
 */
export function useToolIntegrationContext(): ToolIntegrationContext {
  let client: TestMCPClient;
  let api: ApiExpectationSet;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent', retryAttempts: 0 });
    api = new ApiExpectationSet(client.getAxiosInstance());
  });

  afterEach(() => {
    api.cleanup();
  });

  return {
    get client() {
      return client;
    },
    get api() {
      return api;
    },
  };
}

/**
 * Обе проекции ответа (`structuredContent` и `content[0].text`) соответствуют
 * `successEnvelopeSchema(outputDataSchema)`. Вынесено из `describeToolIntegration`
 * отдельной функцией (план §D.2 обещал экспорт, найдено ревью пакета M-5) — нужна
 * особенным многоступенчатым кейсам наравне с обычными.
 */
export function assertMatchesOutputSchema<TDataSchema extends z.ZodObject<z.ZodRawShape>>(
  result: ToolExecutionResult,
  outputDataSchema: TDataSchema
): z.infer<TDataSchema> {
  const envelopeSchema = successEnvelopeSchema(outputDataSchema);

  const structuredParsed = envelopeSchema.safeParse(getStructuredContent(result));
  expect(
    structuredParsed.success,
    structuredParsed.success ? '' : JSON.stringify(structuredParsed.error.format())
  ).toBe(true);

  const textParsed = envelopeSchema.safeParse(JSON.parse(getTextContent(result)));
  expect(
    textParsed.success,
    textParsed.success ? '' : JSON.stringify(textParsed.error.format())
  ).toBe(true);

  if (!structuredParsed.success) {
    throw new Error('unreachable: assertion above уже завершила бы тест');
  }
  return structuredParsed.data.data as z.infer<TDataSchema>;
}

/**
 * `message` совпадает с сообщением `formatValidationError` — отличает отказ
 * ВАЛИДАЦИИ входа от любого другого раннего отказа без HTTP (L-1, найдено ревью
 * пакета): голая проверка `isError` + `attemptedCount === 0` засчитывает оба.
 */
export function assertValidationError(result: ToolExecutionResult): void {
  const structured = getStructuredContent(result) as { message?: unknown };
  expect(
    structured.message,
    `сообщение не подтверждает отказ валидации: ${JSON.stringify(structured)}`
  ).toBe(VALIDATION_ERROR_MESSAGE);
}

/**
 * `error.statusCode` контрактной ошибки (`ErrorEnvelope`, `BaseTool.formatError()`)
 * равен ожидаемому статусу — на ОБЕИХ проекциях ответа. Закрывает вторую половину
 * C-1 (найдено ревью пакета): голый `isError` не отличает 403 от 404, кейс «404»,
 * фактически арранжирующий 403, раньше проходил зелёным.
 */
export function assertContractualError(result: ToolExecutionResult, expectedStatus: number): void {
  for (const [label, payload] of [
    ['structuredContent', getStructuredContent(result)],
    ['content[0].text', JSON.parse(getTextContent(result))],
  ] as const) {
    const error = (payload as { error?: unknown }).error as { statusCode?: unknown } | undefined;
    expect(
      error?.statusCode,
      `${label}.error.statusCode: ожидался ${String(expectedStatus)}, получено ${JSON.stringify(error)}`
    ).toBe(expectedStatus);
  }
}

/** Сценарий с подготовкой ожиданий HTTP и входными параметрами инструмента. */
export interface ArrangedCase {
  readonly arrange: (api: ApiExpectationSet) => void;
  readonly input: Record<string, unknown>;
}

export interface HappyPathCase<TDataSchema extends z.ZodObject<z.ZodRawShape>> {
  readonly input: Record<string, unknown>;
  readonly arrange: (api: ApiExpectationSet) => void;
  /** `*OutputDataSchema` инструмента — тот же Zod-объект, из которого собран `outputSchema`. */
  readonly outputDataSchema: TDataSchema;
  /** Дополнительные проверки данных сверх соответствия схеме. */
  readonly assertData?: (data: z.infer<TDataSchema>) => void;
}

export interface InvalidInputCase {
  /** Вход, который обязан быть отклонён валидацией ДО любого HTTP-запроса. */
  readonly input: Record<string, unknown>;
}

export interface ErrorCases {
  readonly forbidden: ArrangedCase;
  readonly notFound: ArrangedCase;
}

/**
 * Кейс, обязанный доказать инвариант «`warnings` есть и непуст на обеих
 * проекциях, когда `FIELDS_WITHOUT_VALUE` реально сработал» (M-3, найдено ревью
 * пакета) — раньше `describeToolIntegration` проверяла только половину инварианта
 * (`assertNoWarnings` в happy path), а присутствие поля не проверялось нигде, хотя
 * `FIELDS_WITHOUT_VALUE` — штатный код ответа большинства инструментов.
 */
export interface WarningsPresentCase {
  readonly arrange: (api: ApiExpectationSet) => void;
  readonly input: Record<string, unknown>;
  /** Ожидаемые коды предупреждений (обычно `['FIELDS_WITHOUT_VALUE']`). */
  readonly codes: readonly [string, ...string[]];
}

/**
 * `'not-applicable'` — тоже объявление, а не молчаливое умолчание (симметрично
 * `BatchDeclaration`/`PaginationDeclaration`): инструмент, для которого предупреждения
 * физически недостижимы (например, нет полей, которые могли бы отсутствовать),
 * обязан сказать это явно, а не пропустить поле.
 */
export type WarningsDeclaration = 'not-applicable' | WarningsPresentCase;

export interface MixedOutcomeBatchCase {
  readonly arrange: (api: ApiExpectationSet) => void;
  readonly input: Record<string, unknown>;
  /** Идентификатор ключа элемента batch-результата (`issueId`, `key`, ...). */
  readonly keyField: string;
  readonly assert?: (data: unknown) => void;
}

export type BatchDeclaration = 'not-applicable' | { readonly mixedOutcome: MixedOutcomeBatchCase };

export interface PaginationPageCase {
  readonly arrange: (api: ApiExpectationSet) => void;
  readonly input: Record<string, unknown>;
}

export interface PaginationDeclarationDetails {
  readonly type: 'cursor' | 'offset' | 'link';
  /** Полная страница ⇒ `pagination.hasNextPage === true`. */
  readonly fullPage: PaginationPageCase;
  /** Неполная страница ⇒ `pagination.hasNextPage === false`. */
  readonly partialPage: PaginationPageCase;
}

export type PaginationDeclaration = 'none' | PaginationDeclarationDetails;

export interface ToolIntegrationOptions<TDataSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Полное зарегистрированное имя инструмента (с префиксом сервера). */
  readonly tool: string;
  /** Непустой список ожидаемых запросов — метод/путь/ВЕРСИЯ каждого (С-4). */
  readonly expectedRequests: readonly [ExpectedRequestSpec, ...ExpectedRequestSpec[]];
  readonly happyPath: HappyPathCase<TDataSchema>;
  readonly invalidInput: InvalidInputCase;
  readonly errors: ErrorCases;
  readonly batch: BatchDeclaration;
  readonly pagination: PaginationDeclaration;
  readonly warnings: WarningsDeclaration;
}

/** `warnings` отсутствует в обеих проекциях ответа (канон §6, инвариант «только когда непусто»). */
export function assertNoWarnings(result: ToolExecutionResult): void {
  const structured = getStructuredContent(result) as Record<string, unknown>;
  expect(
    structured,
    'structuredContent.warnings не должен присутствовать, если пуст'
  ).not.toHaveProperty('warnings');
  const text = JSON.parse(getTextContent(result)) as Record<string, unknown>;
  expect(text, 'content[0].text.warnings не должен присутствовать, если пуст').not.toHaveProperty(
    'warnings'
  );
}

/** `warnings` присутствует и непуст в обеих проекциях ответа. */
export function assertWarnings(
  result: ToolExecutionResult,
  expectedCodes: readonly string[]
): void {
  const structured = getStructuredContent(result) as { warnings?: Array<{ code: string }> };
  const text = JSON.parse(getTextContent(result)) as { warnings?: Array<{ code: string }> };
  for (const [label, warnings] of [
    ['structuredContent', structured.warnings],
    ['content[0].text', text.warnings],
  ] as const) {
    expect(warnings, `${label}.warnings отсутствует или пуст`).toBeDefined();
    expect(warnings?.length ?? 0, `${label}.warnings пуст`).toBeGreaterThan(0);
    const codes = (warnings ?? []).map((warning) => warning.code);
    for (const expectedCode of expectedCodes) {
      expect(codes, `${label}.warnings не содержит код ${expectedCode}`).toContain(expectedCode);
    }
  }
}

/** Ни одного HTTP-запроса не ушло — для валидации входа и `readOnlyHint`-инвариантов. */
export function assertNoHttp(api: ApiExpectationSet): void {
  expect(api.attemptedCount, 'ожидался отказ без HTTP-запроса').toBe(0);
}

/**
 * Проверяет каноническую форму batch-ответа (`CLAUDE.md` §2.1, `tests/TESTING_STRATEGY.md`
 * §5): `{ total, successful[], failed[] }`, идентификатор в каждом элементе обеих групп.
 *
 * ОБЕ группы обязаны быть непустыми, а `total` — равен их суммарной длине (H-3,
 * найдено ревью пакета): `{ total: 0, successful: [], failed: [] }` раньше проходил
 * как «смешанный исход», хотя это вообще не смешанный исход, а вырожденный пустой
 * ответ — кейс `MixedOutcomeBatchCase` обязан демонстрировать именно смешение.
 */
export function assertBatchShape(
  data: unknown,
  keyField: string
): { readonly total: number; readonly successful: unknown[]; readonly failed: unknown[] } {
  const shape = data as {
    total?: unknown;
    successful?: unknown;
    failed?: unknown;
  };
  expect(typeof shape.total, 'data.total обязан быть числом').toBe('number');
  expect(Array.isArray(shape.successful), 'data.successful обязан быть массивом').toBe(true);
  expect(Array.isArray(shape.failed), 'data.failed обязан быть массивом').toBe(true);
  const successful = shape.successful as unknown[];
  const failed = shape.failed as unknown[];
  expect(
    successful.length,
    'data.successful пуст — смешанный исход требует хотя бы одного успеха'
  ).toBeGreaterThan(0);
  expect(
    failed.length,
    'data.failed пуст — смешанный исход требует хотя бы одного отказа'
  ).toBeGreaterThan(0);
  expect(shape.total, 'data.total не равен successful.length + failed.length').toBe(
    successful.length + failed.length
  );
  for (const item of [...successful, ...failed]) {
    expect(item, `элемент batch-результата без ключа "${keyField}"`).toHaveProperty(keyField);
  }
  return { total: shape.total as number, successful, failed };
}

/** Проверяет `pagination.hasNextPage` в `data.pagination` (форма `PaginationMetaSchema`). */
export function assertPagination(data: unknown, expectedHasNextPage: boolean): void {
  const shape = data as { pagination?: { hasNextPage?: unknown } };
  expect(shape.pagination, 'data.pagination отсутствует').toBeDefined();
  expect(shape.pagination?.hasNextPage, 'data.pagination.hasNextPage неверен').toBe(
    expectedHasNextPage
  );
}

/**
 * `type: 'cursor'` не может сосуществовать с `total`/`totalPages` в ответе — канон
 * (`CLAUDE.md` §2.2) фиксирует их только за seekable-эндпоинтами (`link`), у
 * cursor-эндпоинтов (changelog/comments/links/worklog/checklist) их нет и быть не
 * может. Закрывает половину L-5 (найдено ревью пакета): `pagination.type` раньше
 * ни на что не влиял, кроме текста имени теста — декларация без барьера хуже
 * отсутствия поля. Для `'offset'`/`'link'` доп. барьера нет: канон не запрещает им
 * ни присутствие, ни отсутствие `total` — сильная проверка была бы гипотезой, а не
 * фактом (см. отчёт пакета, решение по L-5).
 */
export function assertPaginationTypeConsistency(
  data: unknown,
  type: PaginationDeclarationDetails['type']
): void {
  if (type !== 'cursor') {
    return;
  }
  const shape = data as { pagination?: { total?: unknown; totalPages?: unknown } };
  expect(
    shape.pagination?.total,
    'cursor-пагинация не отдаёт total (канон CLAUDE.md §2.2: total только у seekable-эндпоинтов)'
  ).toBeUndefined();
  expect(
    shape.pagination?.totalPages,
    'cursor-пагинация не отдаёт totalPages (канон CLAUDE.md §2.2: totalPages только у seekable-эндпоинтов)'
  ).toBeUndefined();
}

/**
 * Роняет suite (на этапе построения `describe`, не в тесте) при необоснуемых
 * `'not-applicable'`/`'none'` (H-2, найдено ревью пакета): сигнал доступен
 * машинно — присутствие `pagination`/`successful`+`failed` в форме
 * `outputDataSchema` делает соответствующую декларацию заведомо ложной. Типом это
 * не выразить (форма `outputDataSchema` не привязана к `batch`/`pagination` на
 * уровне типов без дублирования всей схемы в generic-параметрах), поэтому проверка
 * — рантайм, на модуле, до `describe()`.
 */
function assertBatchPaginationDeclarationsSound<TDataSchema extends z.ZodObject<z.ZodRawShape>>(
  options: ToolIntegrationOptions<TDataSchema>
): void {
  const shapeKeys = Object.keys(options.happyPath.outputDataSchema.shape);
  if (options.pagination === 'none' && shapeKeys.includes('pagination')) {
    throw new Error(
      `${options.tool}: outputDataSchema содержит поле "pagination", но pagination объявлена ` +
        `'none' — декларация необоснуема (H-2)`
    );
  }
  if (
    options.batch === 'not-applicable' &&
    shapeKeys.includes('successful') &&
    shapeKeys.includes('failed')
  ) {
    throw new Error(
      `${options.tool}: outputDataSchema содержит поля "successful"/"failed", но batch ` +
        `объявлен 'not-applicable' — декларация необоснуема (H-2)`
    );
  }
}

/**
 * Порождает обязательный состав интеграционного теста для одного инструмента.
 * Каждый ожидаемый запрос из `options.expectedRequests` заявляет свою версию API —
 * фактическая проводка запросов остаётся за `arrange`-колбэками сценариев (метадата
 * `expectedRequests` документирует состав и версии для матрицы и ревью, но не
 * подменяет собой `ApiExpectationSet`, который реально валидирует порядок и форму).
 */
/**
 * Регистрирует `afterAll`, проверяющий второе направление С-4 (F7, второй раунд
 * ревью пакета): `assertConsumedRequestsDeclared` в каждом `it()` по отдельности
 * проверяет только consumedRequests ⊆ expectedRequests — лишняя запись в
 * `expectedRequests` (неверный путь/версия, которые ни разу не потребуются) не
 * видна НИ ОДНОМУ отдельному `it()`, а `assertAllExpectationsMet()` сверяет
 * очередь, построенную `arrange`, а не декларацию. Возвращает `trackDeclaredHits`
 * — вызывающий обязан прогнать через неё `ctx.api` каждого сгенерированного
 * кейса; накопленное по ВСЕМ кейсам множество проверяется один раз в `afterAll`,
 * после того как отработал последний.
 */
function trackExpectedRequestsCoverage<TDataSchema extends z.ZodObject<z.ZodRawShape>>(
  options: ToolIntegrationOptions<TDataSchema>
): (api: ApiExpectationSet) => void {
  const declaredHitIndexes = new Set<number>();

  afterAll(() => {
    const unused = options.expectedRequests
      .map((spec, index) => ({ spec, index }))
      .filter(({ index }) => !declaredHitIndexes.has(index));
    if (unused.length > 0) {
      throw new Error(
        `${options.tool}: expectedRequests содержит запись(и), ни разу не ` +
          `совпавшую ни с одним фактическим запросом ни в одном кейсе файла ` +
          `(лишняя декларация или опечатка в пути/версии): ` +
          unused
            .map(({ spec }) => `${spec.method.toUpperCase()} ${spec.path} (${spec.apiVersion})`)
            .join(', ')
      );
    }
  });

  return (api: ApiExpectationSet) => {
    for (const request of api.consumedRequests) {
      options.expectedRequests.forEach((spec, index) => {
        if (sameEndpoint(spec, request)) {
          declaredHitIndexes.add(index);
        }
      });
    }
  };
}

export function describeToolIntegration<TDataSchema extends z.ZodObject<z.ZodRawShape>>(
  options: ToolIntegrationOptions<TDataSchema>
): void {
  // Рантайм-барьер H-2 — роняет suite при построении, до единого it(). Намеренно
  // ВНЕ describe(): исключение здесь останавливает загрузку файла теста, а не
  // тонет в одном красном it() среди остальных.
  assertBatchPaginationDeclarationsSound(options);

  describe(`${options.tool} (фабрика обязательного состава)`, () => {
    const ctx = useToolIntegrationContext();
    const trackDeclaredHits = trackExpectedRequestsCoverage(options);

    it('happy path: соответствует outputSchema на обеих проекциях, без warnings', async () => {
      options.happyPath.arrange(ctx.api);

      const result = await ctx.client.callTool(options.tool, options.happyPath.input);

      expect(result.isError, JSON.stringify(getStructuredContent(result))).toBeUndefined();

      const data = assertMatchesOutputSchema(result, options.happyPath.outputDataSchema);
      assertNoWarnings(result);
      assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
      trackDeclaredHits(ctx.api);
      ctx.api.assertAllExpectationsMet();

      options.happyPath.assertData?.(data);
    });

    it('невалидный вход отклоняется без единого HTTP-запроса', async () => {
      const result = await ctx.client.callTool(options.tool, options.invalidInput.input);

      expect(result.isError).toBe(true);
      assertNoHttp(ctx.api);
      assertValidationError(result);
    });

    it('403 маппится в контрактную ошибку', async () => {
      options.errors.forbidden.arrange(ctx.api);

      const result = await ctx.client.callTool(options.tool, options.errors.forbidden.input);

      expect(result.isError).toBe(true);
      assertContractualError(result, 403);
      assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
      trackDeclaredHits(ctx.api);
      ctx.api.assertAllExpectationsMet();
    });

    it('404 маппится в контрактную ошибку', async () => {
      options.errors.notFound.arrange(ctx.api);

      const result = await ctx.client.callTool(options.tool, options.errors.notFound.input);

      expect(result.isError).toBe(true);
      assertContractualError(result, 404);
      assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
      trackDeclaredHits(ctx.api);
      ctx.api.assertAllExpectationsMet();
    });

    if (options.batch !== 'not-applicable') {
      const { mixedOutcome } = options.batch;

      it('batch: смешанный исход даёт обе группы с идентификатором в каждом элементе', async () => {
        mixedOutcome.arrange(ctx.api);

        const result = await ctx.client.callTool(options.tool, mixedOutcome.input);

        expect(result.isError).toBeUndefined();
        const structured = getStructuredContent(result) as { data?: unknown };
        assertBatchShape(structured.data, mixedOutcome.keyField);
        assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
        trackDeclaredHits(ctx.api);
        ctx.api.assertAllExpectationsMet();
        mixedOutcome.assert?.(structured.data);
      });
    }

    if (options.pagination !== 'none') {
      const { type, fullPage, partialPage } = options.pagination;

      it(`пагинация (${type}): полная страница ⇒ hasNextPage=true`, async () => {
        fullPage.arrange(ctx.api);

        const result = await ctx.client.callTool(options.tool, fullPage.input);

        expect(result.isError).toBeUndefined();
        const structured = getStructuredContent(result) as { data?: unknown };
        assertPagination(structured.data, true);
        assertPaginationTypeConsistency(structured.data, type);
        assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
        trackDeclaredHits(ctx.api);
        ctx.api.assertAllExpectationsMet();
      });

      it(`пагинация (${type}): неполная страница ⇒ hasNextPage=false`, async () => {
        partialPage.arrange(ctx.api);

        const result = await ctx.client.callTool(options.tool, partialPage.input);

        expect(result.isError).toBeUndefined();
        const structured = getStructuredContent(result) as { data?: unknown };
        assertPagination(structured.data, false);
        assertPaginationTypeConsistency(structured.data, type);
        assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
        trackDeclaredHits(ctx.api);
        ctx.api.assertAllExpectationsMet();
      });
    }

    if (options.warnings !== 'not-applicable') {
      const { arrange, input, codes } = options.warnings;

      it(`warnings присутствуют и непусты на обеих проекциях (${codes.join(', ')})`, async () => {
        arrange(ctx.api);

        const result = await ctx.client.callTool(options.tool, input);

        expect(result.isError, JSON.stringify(getStructuredContent(result))).toBeUndefined();
        assertWarnings(result, codes);
        assertConsumedRequestsDeclared(ctx.api, options.expectedRequests);
        trackDeclaredHits(ctx.api);
        ctx.api.assertAllExpectationsMet();
      });
    }
  });
}

/**
 * Опции для `describeNoHttpToolIntegration` — явная форма вызова фабрики для
 * класса «инструмент без HTTP» (`ping`, `demo`, `get_issue_urls`): 403/404
 * физически недостижимы, потому что запрос никогда не уходит наружу. Заставлять
 * такой инструмент объявлять `errors`/`batch`/`pagination`/`expectedRequests` (все
 * обязательны в `ToolIntegrationOptions`) означало бы либо врать в декларации, либо
 * заводить фиктивные записи в реестре исключений на ровном месте (M-4, найдено
 * ревью пакета) — вместо этого отдельная фабрика с урезанным контрактом.
 */
export interface NoHttpHappyPathCase<TDataSchema extends z.ZodObject<z.ZodRawShape>> {
  readonly input: Record<string, unknown>;
  readonly outputDataSchema: TDataSchema;
  readonly assertData?: (data: z.infer<TDataSchema>) => void;
}

export interface NoHttpToolIntegrationOptions<TDataSchema extends z.ZodObject<z.ZodRawShape>> {
  readonly tool: string;
  readonly happyPath: NoHttpHappyPathCase<TDataSchema>;
  /** Опционален: не у каждого инструмента без HTTP вообще есть параметры входа. */
  readonly invalidInput?: InvalidInputCase;
}

/**
 * Фабрика для инструментов, не делающих ни одного HTTP-запроса (M-4). В отличие от
 * `describeToolIntegration`, не требует `expectedRequests`/`errors`/`batch`/
 * `pagination` — их не существует у этого класса инструментов по построению.
 * `attemptedCount === 0` проверяется на happy path так же, как обычно проверяется
 * только для `invalidInput` — здесь это ожидаемое поведение УСПЕШНОГО вызова.
 */
export function describeNoHttpToolIntegration<TDataSchema extends z.ZodObject<z.ZodRawShape>>(
  options: NoHttpToolIntegrationOptions<TDataSchema>
): void {
  describe(`${options.tool} (фабрика: инструмент без HTTP)`, () => {
    const ctx = useToolIntegrationContext();

    it('happy path: соответствует outputSchema на обеих проекциях, без единого HTTP-запроса', async () => {
      const result = await ctx.client.callTool(options.tool, options.happyPath.input);

      expect(result.isError, JSON.stringify(getStructuredContent(result))).toBeUndefined();

      const data = assertMatchesOutputSchema(result, options.happyPath.outputDataSchema);
      assertNoWarnings(result);
      assertNoHttp(ctx.api);

      options.happyPath.assertData?.(data);
    });

    if (options.invalidInput) {
      const { input } = options.invalidInput;

      it('невалидный вход отклоняется без единого HTTP-запроса', async () => {
        const result = await ctx.client.callTool(options.tool, input);

        expect(result.isError).toBe(true);
        assertNoHttp(ctx.api);
        assertValidationError(result);
      });
    }
  });
}
