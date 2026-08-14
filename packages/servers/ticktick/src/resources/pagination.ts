/**
 * Пагинация внутри одного `ResourceProvider` TickTick (пакет 5.1.C.ticktick
 * плана модернизации MCP 2026-07-28).
 *
 * `ResourceRegistry` (framework, `@fractalizer/mcp-core`) оборачивает курсор
 * ОДНОГО провайдера в собственный opaque-курсор агрегата — форма внутреннего
 * курсора провайдера при этом остаётся его личным делом (см. комментарий
 * `ResourceListPage.nextCursor` в `resource-provider.ts` framework). Здесь —
 * простейшая форма: десятичное смещение как строка, тот же приём, что и у
 * `WireTestResourceProvider` в тестах framework
 * (`tests/mcp-server-adapter/resources.wire.test.ts`). Провайдеры TickTick
 * держат весь список в памяти за один вызов facade (`getProjects()`/
 * `getAllTasks()`, уже кешируемый на уровне operations), поэтому пагинация
 * здесь — исключительно нарезка уже полученного массива, не отдельные
 * HTTP-страницы.
 */

/** Одна страница офсетной пагинации массива в памяти. */
export interface OffsetPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
}

/**
 * Нарезать массив на страницу по офсетному курсору.
 *
 * @param all - полный массив (уже загруженный вызывающим провайдером)
 * @param cursor - `nextCursor`, ранее возвращённый этой же функцией, либо
 *   `undefined` для первой страницы
 * @param pageSize - размер страницы
 * @throws {Error} если курсор — не десятичное неотрицательное целое (защита
 *   от «тихого» отката на первую страницу при повреждённом курсоре — тот же
 *   принцип, что и у `OpaqueCursorCodec` framework)
 */
export function paginateOffset<T>(
  all: readonly T[],
  cursor: string | undefined,
  pageSize: number
): OffsetPage<T> {
  const offset = decodeOffset(cursor);
  const items = all.slice(offset, offset + pageSize);
  const nextOffset = offset + pageSize;

  return {
    items,
    ...(nextOffset < all.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

function decodeOffset(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }
  if (!/^\d+$/.test(cursor)) {
    throw new Error(`Невалидный курсор пагинации ресурсов TickTick: "${cursor}"`);
  }
  return Number.parseInt(cursor, 10);
}
