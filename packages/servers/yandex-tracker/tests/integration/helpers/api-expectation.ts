/**
 * Оснастка ожиданий HTTP-запросов для интеграционных тестов на фабрике
 * `describeToolIntegration` (`./tool-integration-suite.ts`).
 *
 * Зачем отдельный класс, а не расширение `mock-server.ts`: тот содержит 1726 строк
 * рукописных методов вида `mockCreateComponentSuccess`, по одному на инструмент —
 * для 59 инструментов это была бы точка конфликта параллельных пакетов и рост файла
 * втрое (см. `.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`
 * §D). `mock-server.ts` не трогается: 33 существующих теста продолжают работать на нём,
 * новые тесты пишутся только через `ApiExpectationSet`.
 *
 * Свойства, которые оснастка обязана гарантировать (план §D.1):
 * - незаявленный запрос роняет тест;
 * - заявленный, но не случившийся запрос роняет `assertAllExpectationsMet()`;
 * - порядок ожиданий значим (delete_component: GET → DELETE; transition_issue:
 *   `_execute` → GET);
 * - несколько ответов на один и тот же путь (страница 1, затем страница 2);
 * - заголовки ответа доступны (`Link rel="next"`/`rel="seek"`);
 * - `apiVersion` сверяется с префиксом пути — типовая опечатка (v2 вместо v3) не
 *   должна тихо разъехаться с реальным путём операции.
 *
 * Про retry и незаявленный запрос: `axios-mock-adapter` с `onNoMatch:'throwException'`
 * бросает ошибку без `.response`/`.request` → `ErrorMapper` заворачивает её в
 * `NETWORK_ERROR` (статус 0) → `ExponentialBackoffStrategy` считает такой исход
 * неопределённым и ретраит GET по умолчанию 3 раза (~7s экспоненциальной паузы).
 * Подтверждено экспериментом (создатель пакета, `createTestClient` с дефолтным
 * `retryAttempts` против незамоканного `get_boards`: 7019ms; с `retryAttempts: 0`
 * — 7ms). Поэтому `describeToolIntegration` создаёт тестовый клиент с
 * `retryAttempts: 0`.
 *
 * ВАЖНО (найдено ревью пакета, M-2): `HarnessExpectationError` НЕ пользуется тем же
 * механизмом, что `ScopeViolationError` (`retryable: false`, читается
 * `RetryHandler` до обращения к стратегии). Response-interceptor
 * (`packages/framework/infrastructure/src/http/client/axios-http-client.ts`)
 * пропускает без обёртки только `ScopeViolationError` — любая другая ошибка,
 * включая эту, уходит в `ErrorMapper.mapAxiosError()`, а тот в ветке «ошибка без
 * `.response`/`.request`» конструирует НОВЫЙ `ApiErrorClass(NETWORK_ERROR, ...)`,
 * теряя исходный объект и любые его поля целиком. Поле `retryable` здесь никогда
 * не доходит до `RetryHandler` — единственная реальная защита от retry в этой
 * оснастке это `retryAttempts: 0` у тестового клиента (см.
 * `tool-integration-suite.ts`), а не поле на классе ошибки. Раньше в докблоке было
 * обратное утверждение — это было неверно, здесь фиксируется факт, а не обещание.
 *
 * СЛЕПОЕ ПЯТНО (M-1): сама механика retry (успех со второй попытки после
 * временного отказа) этой оснасткой не наблюдается и не может наблюдаться —
 * `ApiExpectationSet` даёт запросу ровно один слот в упорядоченной очереди,
 * повторная отправка того же запроса — это ЛИБО следующий элемент очереди (если
 * он объявлен), ЛИБО незаявленный запрос (роняет тест). Retry-логика
 * (`ExponentialBackoffStrategy`/`RetryHandler`) проверяется на уровне
 * `packages/framework/infrastructure` юнит-тестами, не здесь.
 */

import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios' with { 'resolution-mode': 'require' };

/** Версии API Трекера, наблюдаемые в кодовой базе (см. CLAUDE.md, таблица версий). */
export type ApiVersion = 'v2' | 'v3';

/** HTTP-методы, которые реально встречаются в операциях Трекера. */
export type HttpMethodLower = 'get' | 'post' | 'patch' | 'delete' | 'put';

/** Функция-матчер тела запроса — для случаев, когда точное совпадение неуместно. */
export type BodyMatcher = ((parsedBody: unknown) => boolean) | undefined;

export interface ExpectedRequestSpec {
  /** HTTP-метод запроса. */
  readonly method: HttpMethodLower;
  /**
   * Относительный путь запроса, ВКЛЮЧАЯ версию (например, `/v3/boards`,
   * `/v3/filters/`). Завершающий слэш значим — часть операций Трекера
   * (`create_filter`, `create_queue`) шлёт его осознанно (см.
   * `tests/TESTING_STRATEGY.md` §2).
   */
  readonly path: string;
  /** Версия API этого конкретного запроса — обязательна по контракту С-4. */
  readonly apiVersion: ApiVersion;
  /**
   * Ожидаемые query-параметры. Объявленные ключи сверяются (остальные не
   * проверяются), но **отсутствие поля целиком — не «не проверять», а
   * утверждение «запрос идёт без query»**: запрос, несущий незаявленный query,
   * роняет тест. Query собирается и из строки в самом пути операции
   * (`/v3/entities/goal/{id}?fields=keyResultItems`), и из параметров axios —
   * раньше первая форма терялась при `url.split('?')`, и константа в URL не
   * наблюдалась ничем (ревью волны 2.1.2: 35 кейсов молча игнорировали query).
   */
  readonly query?: Record<string, string | number | boolean>;
  /** Ожидаемое тело запроса — точное совпадение (после JSON.parse) либо матчер. */
  readonly body?: unknown | BodyMatcher;
}

export type ReplyHeaders = Record<string, string>;
export type ReplyTuple = [status: number, body: unknown, headers?: ReplyHeaders];

export interface RequestExpectationHandle {
  /** Задаёт ответ на этот конкретный (по порядку) запрос. */
  reply(status: number, body?: unknown, headers?: ReplyHeaders): void;
}

/**
 * Отказ рубежа оснастки: незаявленный запрос, нарушенный порядок, несовпавшие
 * параметры. НЕ обходит retry сам по себе (см. шапку файла, M-2) — единственная
 * защита от retry-задержки это `retryAttempts: 0` у тестового клиента.
 */
export class HarnessExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HarnessExpectationError';
  }
}

interface QueueEntry {
  readonly spec: ExpectedRequestSpec;
  response?: ReplyTuple;
}

interface CapturedRequestConfig {
  readonly method?: string;
  readonly url?: string;
  readonly params?: Record<string, unknown>;
  readonly data?: unknown;
}

function normalizeMethod(method: string | undefined): string {
  return (method ?? '').toLowerCase();
}

/**
 * Фактический query запроса — объединение того, что операция вшила прямо в путь
 * (`/v3/entities/goal/{id}?fields=keyResultItems`), и того, что axios получил
 * параметрами. Раньше первая форма терялась целиком: путь сверялся как
 * `url.split('?')[0]`, и константа в URL операции не наблюдалась ничем (ревью
 * волны 2.1.2, claude-01/codex-03 — четыре инструмента целей).
 */
function mergeQuery(
  inlineQuery: string | undefined,
  params: Record<string, unknown> | undefined
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  if (inlineQuery !== undefined && inlineQuery.length > 0) {
    for (const [key, value] of new URLSearchParams(inlineQuery).entries()) {
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Сравнение значения query-параметра: из URL значения приходят строками, из
 * `params` — в исходном типе (число/булево), поэтому `perPage: 10` и `"10"` —
 * одно и то же значение одного и того же запроса.
 */
function sameQueryValue(actual: unknown, expected: unknown): boolean {
  if (deepEqual(actual, expected)) {
    return true;
  }
  return String(actual) === String(expected);
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

/**
 * Глубокое сравнение без `any`. `Array.isArray` сверяется явно (L-2, найдено
 * ревью пакета): без этой проверки `[1, 2]` и `{ '0': 1, '1': 2 }` проходили как
 * равные — оба после `Object.keys().sort()` дают ключи `['0', '1']`.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  const aKeys = Object.keys(a as Record<string, unknown>).sort();
  const bKeys = Object.keys(b as Record<string, unknown>).sort();
  if (aKeys.length !== bKeys.length || !aKeys.every((key, index) => key === bKeys[index])) {
    return false;
  }
  return aKeys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/**
 * Ожидания HTTP-запросов для одного теста. Каждый вызов `expectRequest`
 * добавляет запись в конец очереди; запросы обязаны прийти строго в этом
 * порядке.
 */
export class ApiExpectationSet {
  private readonly adapter: MockAdapter;
  private readonly queue: QueueEntry[] = [];
  private cursor = 0;
  private attempted = 0;

  constructor(axiosInstance: AxiosInstance) {
    this.adapter = new MockAdapter(axiosInstance, {
      delayResponse: 0,
      onNoMatch: 'throwException',
    });
    this.adapter.onAny().reply((config: CapturedRequestConfig) => this.handle(config));
  }

  /** Сколько запросов оснастка фактически перехватила (включая провалившиеся). */
  get attemptedCount(): number {
    return this.attempted;
  }

  /**
   * Спецификации запросов, которые реально дошли и совпали с очередью (в порядке
   * прихода). Используется фабрикой для сверки с `expectedRequests` (H-1, найдено
   * ревью пакета): объявление в `expectedRequests` без опоры на факт ничего не
   * значило, пока путь и версия объявлялись отдельно в `arrange`.
   */
  get consumedRequests(): readonly ExpectedRequestSpec[] {
    return this.queue.slice(0, this.cursor).map((entry) => entry.spec);
  }

  /**
   * Регистрирует следующее по порядку ожидание. Возвращает хендл — вызывающий
   * обязан вызвать `.reply(...)`, иначе запрос до него дойдёт и упадёт с
   * «ожидание без ответа» ещё до сравнения параметров.
   */
  expectRequest(spec: ExpectedRequestSpec): RequestExpectationHandle {
    this.assertVersionMatchesPath(spec);
    const entry: QueueEntry = { spec };
    this.queue.push(entry);
    return {
      reply: (status: number, body: unknown = {}, headers?: ReplyHeaders) => {
        entry.response = headers !== undefined ? [status, body, headers] : [status, body];
      },
    };
  }

  /** Роняет тест, если остались объявленные, но не случившиеся запросы. */
  assertAllExpectationsMet(): void {
    if (this.cursor < this.queue.length) {
      const missing = this.queue
        .slice(this.cursor)
        .map((entry) => `${entry.spec.method.toUpperCase()} ${entry.spec.path}`)
        .join(', ');
      throw new Error(
        `Не все заявленные запросы произошли (осталось ${String(this.queue.length - this.cursor)}): ${missing}`
      );
    }
  }

  /** Восстанавливает исходный axios adapter. Вызывать в `afterEach`. */
  cleanup(): void {
    this.adapter.restore();
  }

  private assertVersionMatchesPath(spec: ExpectedRequestSpec): void {
    const prefix = `/${spec.apiVersion}/`;
    if (!spec.path.startsWith(prefix)) {
      throw new Error(
        `apiVersion "${spec.apiVersion}" не соответствует пути "${spec.path}" ` +
          `(ожидался префикс "${prefix}") — опечатка в объявлении ожидания`
      );
    }
  }

  private handle(config: CapturedRequestConfig): ReplyTuple {
    this.attempted += 1;
    const entry = this.queue[this.cursor];
    const method = normalizeMethod(config.method);
    const [path] = (config.url ?? '').split('?');
    if (!entry) {
      throw new HarnessExpectationError(
        `Незаявленный запрос: ${method.toUpperCase()} ${path ?? String(config.url)}. ` +
          `Все объявленные ожидания (${String(this.queue.length)}) уже исчерпаны.`
      );
    }
    const mismatch = this.describeMismatch(entry.spec, config);
    if (mismatch !== undefined) {
      throw new HarnessExpectationError(
        `Запрос не совпал с ожиданием #${String(this.cursor + 1)} ` +
          `(${entry.spec.method.toUpperCase()} ${entry.spec.path}): ${mismatch}`
      );
    }
    if (!entry.response) {
      throw new HarnessExpectationError(
        `Ожидание #${String(this.cursor + 1)} (${entry.spec.method.toUpperCase()} ${entry.spec.path}) ` +
          `не получило .reply(...) до того, как запрос до него дошёл`
      );
    }
    this.cursor += 1;
    return entry.response;
  }

  private describeMismatch(
    spec: ExpectedRequestSpec,
    config: CapturedRequestConfig
  ): string | undefined {
    const method = normalizeMethod(config.method);
    if (method !== spec.method) {
      return `метод ${method.toUpperCase()} ≠ ожидаемому ${spec.method.toUpperCase()}`;
    }
    const [path, inlineQuery] = (config.url ?? '').split('?');
    if (path !== spec.path) {
      return `путь "${String(path)}" ≠ ожидаемому "${spec.path}"`;
    }
    const actualParams = mergeQuery(inlineQuery, config.params);
    if (spec.query === undefined) {
      const actualKeys = Object.keys(actualParams);
      if (actualKeys.length > 0) {
        return (
          `запрос несёт незаявленный query (${actualKeys.join(', ')} = ` +
          `${JSON.stringify(actualParams)}), а ожидание его не объявило: ` +
          `добавь query в ExpectedRequestSpec — параметр, попавший в запрос молча, ` +
          `свидетельством С-2 не является`
        );
      }
    } else {
      const queryMismatch = Object.entries(spec.query).find(
        ([key, value]) => !sameQueryValue(actualParams[key], value)
      );
      if (queryMismatch) {
        return `query-параметр "${queryMismatch[0]}" не совпал (ожидалось ${JSON.stringify(queryMismatch[1])}, получено ${JSON.stringify(actualParams[queryMismatch[0]])})`;
      }
    }
    if (spec.body !== undefined) {
      const actualBody = parseBody(config.data);
      const matcherOrValue = spec.body;
      if (typeof matcherOrValue === 'function') {
        const matches = (matcherOrValue as (body: unknown) => boolean)(actualBody);
        if (!matches) {
          return `тело запроса не прошло матчер: ${JSON.stringify(actualBody)}`;
        }
      } else if (!deepEqual(actualBody, matcherOrValue)) {
        return `тело запроса не совпало (ожидалось ${JSON.stringify(matcherOrValue)}, получено ${JSON.stringify(actualBody)})`;
      }
    }
    return undefined;
  }
}

/** Хелпер для быстрого создания `ApiExpectationSet` в тестах. */
export function createApiExpectationSet(axiosInstance: AxiosInstance): ApiExpectationSet {
  return new ApiExpectationSet(axiosInstance);
}

/**
 * Совпадают ли два запроса по методу/пути/версии (без учёта query/body) — сверка
 * «консервативной» части декларации. Используется фабрикой для проверки, что
 * фактически потреблённые запросы (`ApiExpectationSet.consumedRequests`)
 * действительно объявлены в `expectedRequests` (H-1).
 */
export function sameEndpoint(a: ExpectedRequestSpec, b: ExpectedRequestSpec): boolean {
  return a.method === b.method && a.path === b.path && a.apiVersion === b.apiVersion;
}

/**
 * Сверяет фактически потреблённые запросы (`ApiExpectationSet.consumedRequests`) с
 * декларацией `expectedRequests` фабрики `describeToolIntegration` (H-1, найдено
 * ревью пакета): без этой сверки пустой `arrange` неотличим от легитимной ошибки —
 * незаявленный запрос падает `HarnessExpectationError`, инструмент отдаёт
 * `isError:true`, и голая проверка `isError` засчитывает это как пройденный кейс
 * (C-1). Первая же проверка (`consumed.length > 0`) закрывает именно этот случай:
 * пустой `arrange` не потребляет ни одного запроса, даже если что-то было
 * ПОПЫТАНО (`attemptedCount`) — попытка, разбившаяся о незаявленность, в очередь
 * не попадает.
 */
export function assertConsumedRequestsDeclared(
  api: ApiExpectationSet,
  declared: readonly ExpectedRequestSpec[]
): void {
  const consumed = api.consumedRequests;
  if (consumed.length === 0) {
    throw new Error(
      'Ни один HTTP-запрос не был успешно потреблён оснасткой — пустой или ' +
        'ошибочный arrange неотличим от отказа API без этой проверки (см. C-1, ' +
        'ревью пакета tracker test coverage)'
    );
  }
  for (const request of consumed) {
    const isDeclared = declared.some((spec) => sameEndpoint(spec, request));
    if (!isDeclared) {
      throw new Error(
        `Запрос ${request.method.toUpperCase()} ${request.path} фактически ушёл, но не ` +
          `объявлен в expectedRequests (объявлено: ${declared
            .map((spec) => `${spec.method.toUpperCase()} ${spec.path}`)
            .join(', ')})`
      );
    }
  }
}
