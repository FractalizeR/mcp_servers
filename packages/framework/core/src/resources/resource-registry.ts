/**
 * ResourceRegistry — реестр `ResourceProvider` (пакет 5.1.A плана
 * модернизации MCP 2026-07-28), зеркалирует роль `ToolRegistry` для
 * инструментов: composition root каждого сервера регистрирует провайдеров
 * через `register()`, adapter обращается к ЕДИНОМУ реестру в обработчиках
 * `resources/list`/`resources/read`/`resources/templates/list`.
 *
 * АГРЕГАЦИЯ НЕСКОЛЬКИХ ПРОВАЙДЕРОВ И ПАГИНАЦИЯ.
 *
 * Один сервер может зарегистрировать несколько провайдеров (например,
 * Трекер — отдельно issues/queues/projects). `resources/list` — единый
 * плоский список для клиента, поэтому реестр обходит провайдеров по одному
 * за вызов в детерминированном порядке (сортировка по `id`, как
 * `ToolSorter` — вторичный ключ гарантирует побайтовую стабильность),
 * возвращая ровно одну страницу ОДНОГО провайдера за вызов:
 *   - пока у текущего провайдера есть `nextCursor` — агрегатный курсор
 *     продолжает указывать на него же;
 *   - когда текущий провайдер исчерпан — агрегатный курсор переключается на
 *     следующего провайдера (с его первой страницы);
 *   - когда исчерпан последний провайдер — `nextCursor` отсутствует.
 *
 * Курсор агрегата кодируется тем же {@link OpaqueCursorCodec}, что и
 * внутренние курсоры провайдеров, с тегом `AGGREGATE_CURSOR_TAG` — это
 * механизм, ОБЩИЙ для всех вызовов реестра (см. opaque-cursor.ts).
 */

import { ResourceNotFoundError, ProtocolError } from '@modelcontextprotocol/server';
import { OpaqueCursorCodec, InvalidOpaqueCursorError } from './pagination/opaque-cursor.js';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from './resource-provider.js';

/** Тег семейства курсора агрегата — единый для ResourceRegistry.listResources. */
const AGGREGATE_CURSOR_TAG = 'resources-agg';

/** Полезная нагрузка курсора агрегата: какой провайдер + его внутренний курсор. */
interface AggregateCursorState {
  readonly providerId: string;
  readonly inner?: string;
}

/** Позиция, с которой резолвится очередной вызов `listResources`. */
interface StartPosition {
  readonly index: number;
  readonly inner?: string;
}

export class ResourceRegistry {
  private readonly providers = new Map<string, ResourceProvider>();

  /**
   * Зарегистрировать провайдера. `id` обязан быть уникален в пределах
   * реестра (обычно — в пределах одного сервера); повторная регистрация
   * того же `id` — ошибка конфигурации, а не тихая перезапись.
   */
  register(provider: ResourceProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`ResourceProvider с id "${provider.id}" уже зарегистрирован`);
    }
    this.providers.set(provider.id, provider);
  }

  /** Провайдеры в детерминированном порядке (сортировка по id). */
  private orderedProviders(): ResourceProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Одна страница агрегированного списка ресурсов. См. заголовок файла —
   * контракт пагинации между провайдерами.
   */
  async listResources(cursor?: string): Promise<ResourceListPage> {
    const providers = this.orderedProviders();
    if (providers.length === 0) {
      return { resources: [] };
    }

    const start = this.resolveStartPosition(providers, cursor);
    // Безопасно: resolveStartPosition либо возвращает index=0 (providers
    // непусты — проверено выше), либо index — результат успешного
    // findIndex (иначе кидает ProtocolError раньше).
    const provider = providers[start.index] as ResourceProvider;
    const page = await provider.listResources(start.inner);

    return this.projectPage(providers, start.index, page);
  }

  /**
   * Прочитать содержимое ресурса. Опрашивает провайдеров по очереди (см.
   * `ResourceProvider.readResource` — `undefined` не является ошибкой на
   * уровне одного провайдера); при отказе всех — `ResourceNotFoundError`,
   * которую SDK сериализует как `-32602` на любой ревизии протокола.
   */
  async readResource(uri: string): Promise<readonly McpResourceContents[]> {
    for (const provider of this.orderedProviders()) {
      const contents = await provider.readResource(uri);
      if (contents !== undefined) {
        return contents;
      }
    }
    throw new ResourceNotFoundError(uri);
  }

  /** Полный список шаблонов ресурсов всех провайдеров (конкатенация, без пагинации). */
  async listTemplates(): Promise<readonly McpResourceTemplate[]> {
    const all: McpResourceTemplate[] = [];
    for (const provider of this.orderedProviders()) {
      all.push(...(await provider.listTemplates()));
    }
    return all;
  }

  /**
   * Резолвит стартовую позицию обхода: без курсора — первый провайдер;
   * с курсором — декодированные (providerId, inner).
   *
   * @throws {ProtocolError} `-32602`, если курсор невалиден ИЛИ ссылается на
   *   провайдера, которого сейчас нет в реестре (например, конфигурация
   *   сервера изменилась между вызовами) — то же поведение, что у
   *   `InvalidCursorError` Трекера: явная ошибка, не тихий возврат первой
   *   страницы.
   */
  private resolveStartPosition(
    providers: readonly ResourceProvider[],
    cursor: string | undefined
  ): StartPosition {
    if (cursor === undefined) {
      return { index: 0 };
    }

    const state = this.decodeAggregateCursor(cursor);
    const index = providers.findIndex((p) => p.id === state.providerId);
    if (index === -1) {
      throw new ProtocolError(
        -32602,
        `Курсор resources/list ссылается на неизвестного провайдера ресурсов "${state.providerId}"`
      );
    }

    return { index, ...(state.inner !== undefined ? { inner: state.inner } : {}) };
  }

  /**
   * Проецирует страницу одного провайдера в страницу агрегата, продолжая
   * либо тем же провайдером, либо переключаясь на следующего.
   */
  private projectPage(
    providers: readonly ResourceProvider[],
    currentIndex: number,
    page: ResourceListPage
  ): ResourceListPage {
    if (page.nextCursor !== undefined) {
      const provider = providers[currentIndex] as ResourceProvider; // см. listResources
      return {
        resources: page.resources,
        nextCursor: this.encodeAggregateCursor(provider.id, page.nextCursor),
      };
    }

    const nextProvider = providers[currentIndex + 1];
    if (nextProvider === undefined) {
      return { resources: page.resources };
    }

    return {
      resources: page.resources,
      nextCursor: this.encodeAggregateCursor(nextProvider.id),
    };
  }

  private encodeAggregateCursor(providerId: string, inner?: string): string {
    const state: AggregateCursorState = {
      providerId,
      ...(inner !== undefined ? { inner } : {}),
    };
    return OpaqueCursorCodec.encode(state, AGGREGATE_CURSOR_TAG);
  }

  private decodeAggregateCursor(cursor: string): AggregateCursorState {
    try {
      return OpaqueCursorCodec.decode<AggregateCursorState>(cursor, AGGREGATE_CURSOR_TAG);
    } catch (error) {
      if (error instanceof InvalidOpaqueCursorError) {
        throw new ProtocolError(-32602, `Невалидный курсор resources/list: ${error.message}`);
      }
      throw error;
    }
  }
}
