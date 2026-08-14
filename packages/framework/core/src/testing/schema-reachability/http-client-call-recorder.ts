/**
 * Подмена всех методов `IHttpClient` накопителем вызовов ("haystack") для
 * проверки достижимости параметров (пакет 7.1.E плана модернизации MCP
 * 2026-07-28).
 *
 * Обе прежних реализации (Трекер/Wiki) делали ровно это порознь —
 * различались только числом мокаемых методов (Трекер — все 6, Wiki — 4 без
 * `getWithResponse`/`postWithResponse`, хотя оба метода есть в самом
 * `IHttpClient`). Сведённая версия подменяет все 6 — иначе сервер, начавший
 * использовать `getWithResponse`/`postWithResponse` (пагинация по
 * заголовкам, см. `ARCHITECTURE.md` про пагинацию), тихо выпал бы из
 * проверки.
 *
 * БЕЗ ЗАВИСИМОСТИ ОТ ТЕСТ-РАННЕРА (важно: этот файл — часть `src/`
 * публикуемого пакета `@fractalizer/mcp-core`, npm publish берёт исходники
 * как есть). Раньше здесь был `vi.spyOn` из `vitest` — knip (`knip:root`
 * шага `npm run validate`) справедливо ловил это как утечку тест-раннера в
 * продакшн-граф импортов пакета: объявление `vitest` опциональным peer
 * снимает вопрос установки у потребителя, но не убирает сам факт, что
 * граф импортов пакета из npm ведёт в тест-раннер. Подмена метода объекта —
 * обычное присваивание свойства (`httpClient[method] = ...`), никакого
 * mock-фреймворка для этого не нужно: спай в духе vitest — это то же самое
 * присваивание плюс учёт вызовов и способ откатить его назад, и то, и
 * другое элементарно на замыканиях.
 *
 * ОТВЕТ-ЗАГЛУШКА — глубокий self-consistent stub (Proxy), а не `{}`: взято у
 * Wiki-версии, а не у Трекера. Операция может читать вложенные поля ответа
 * (`response.data.foo.bar`) до того, как инструмент упадёт — с `{}` это
 * бросило бы `Cannot read properties of undefined` РАНЬШЕ, чем успели бы
 * выполниться все запланированные HTTP-вызовы тула (актуально для
 * многошаговых операций: сначала GET, потом на основе ответа — POST).
 * Тест интересует только факт исходящего вызова, содержимое ответа
 * безразлично.
 */

import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

/** Глубокий self-consistent stub: любое обращение к свойству возвращает новый stub, не бросает. */
function createDeepStub(): unknown {
  const handler: ProxyHandler<Record<PropertyKey, unknown>> = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => 'stub';
      if (prop === 'valueOf' || prop === 'toString') return () => 'stub';
      if (prop === 'then') return undefined;
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'length') return 0;
      return createDeepStub();
    },
  };
  return new Proxy({}, handler);
}

/** Имена методов `IHttpClient`, которые подменяются накопителем вызовов. */
type HttpClientMethodName =
  | 'get'
  | 'post'
  | 'patch'
  | 'delete'
  | 'getWithResponse'
  | 'postWithResponse';

const HTTP_CLIENT_METHODS: readonly HttpClientMethodName[] = [
  'get',
  'post',
  'patch',
  'delete',
  'getWithResponse',
  'postWithResponse',
];

/** Сигнатура, общая для всех 6 методов после стирания типов аргументов/результата — только для подмены/отката. */
type AnyHttpClientMethod = (...args: unknown[]) => unknown;

export interface HttpClientCallRecorder {
  /** Сериализованный вид ВСЕХ накопленных с последнего `clear()` вызовов (для substring-поиска маркеров). */
  haystack(): string;
  /** Забыть накопленные вызовы (обычно — перед следующим `tool.execute()`). */
  clear(): void;
  /** Вернуть оригинальные методы `httpClient` (обычно не нужен — instance одноразовый per test file). */
  restore(): void;
}

/**
 * Подменить все 6 методов `IHttpClient` накопителем: каждый вызов
 * сериализуется и складывается в общий журнал, а вызывающему возвращается
 * глубокий stub вместо реального ответа API.
 */
export function createHttpClientCallRecorder(httpClient: IHttpClient): HttpClientCallRecorder {
  const calls: string[] = [];
  const mutableClient = httpClient as unknown as Record<HttpClientMethodName, AnyHttpClientMethod>;
  const originals: Partial<Record<HttpClientMethodName, AnyHttpClientMethod>> = {};

  for (const method of HTTP_CLIENT_METHODS) {
    originals[method] = mutableClient[method];
    mutableClient[method] = (...args: unknown[]): Promise<unknown> => {
      calls.push(JSON.stringify(args));
      return Promise.resolve(createDeepStub());
    };
  }

  return {
    haystack: (): string => calls.join('\n'),
    clear: (): void => {
      calls.length = 0;
    },
    restore: (): void => {
      for (const method of HTTP_CLIENT_METHODS) {
        const original = originals[method];
        if (original) {
          mutableClient[method] = original;
        }
      }
    },
  };
}
