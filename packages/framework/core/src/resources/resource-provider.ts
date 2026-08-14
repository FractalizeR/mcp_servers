/**
 * Контракт `ResourceProvider` (пакет 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Единственный публичный контракт, который следующая волна (пакет 5.1.C —
 * провайдеры Трекера/Wiki/TickTick) обязана реализовать, чтобы её ресурсы
 * появились в `resources/list`/`resources/read`/`resources/templates/list`.
 * Регистрация — через `ResourceRegistry.register()`, вызываемую из
 * composition root каждого сервера (тот же паттерн, что и у `ToolRegistry`).
 *
 * КОНТРАКТ `readResource` НЕ ОГРАНИЧЕН СОСТАВОМ `listResources`.
 *
 * Спека 2026-07-28 прямо разрешает `resource_link`, возвращённый инструментом
 * (пакет 5.1.B), указывать на ресурс, отсутствующий в `resources/list` —
 * например, потому что список слишком велик, чтобы перечислять его целиком,
 * а сам ресурс адресуем по вычисляемому URI. Поэтому `readResource(uri)` —
 * независимый метод: провайдер обязан уметь прочитать ЛЮБОЙ URI своей схемы,
 * а не только те, что попали в текущую страницу `listResources`.
 */

/**
 * Один ресурс в ответе `resources/list`.
 */
export interface McpResource {
  /** Уникальный URI ресурса (например, `tracker://issue/PROJ-1`). */
  readonly uri: string;
  /** Машиночитаемое имя ресурса. */
  readonly name: string;
  /** Человекочитаемый заголовок (опционально). */
  readonly title?: string;
  /** Описание ресурса (опционально). */
  readonly description?: string;
  /** MIME-тип содержимого (опционально). */
  readonly mimeType?: string;
  /** Размер содержимого в байтах, если известен заранее (опционально). */
  readonly size?: number;
}

/**
 * Один шаблон ресурса в ответе `resources/templates/list` (RFC 6570 URI
 * Template, например `tracker://issue/{key}`).
 */
export interface McpResourceTemplate {
  readonly uriTemplate: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** Текстовое содержимое ресурса. */
export interface McpResourceTextContents {
  readonly uri: string;
  readonly mimeType?: string;
  readonly text: string;
}

/** Бинарное содержимое ресурса (base64). */
export interface McpResourceBlobContents {
  readonly uri: string;
  readonly mimeType?: string;
  readonly blob: string;
}

/** Содержимое одного ресурса — текстовое либо бинарное (взаимоисключающе). */
export type McpResourceContents = McpResourceTextContents | McpResourceBlobContents;

/**
 * Одна страница результата `listResources`.
 *
 * `nextCursor` — курсор ТОЛЬКО этого провайдера (его форма — внутреннее дело
 * провайдера, `ResourceRegistry` рассматривает его как непрозрачную строку и
 * оборачивает в собственный курсор агрегата — см. resource-registry.ts).
 * Отсутствие `nextCursor` означает «страниц этого провайдера больше нет».
 */
export interface ResourceListPage {
  readonly resources: readonly McpResource[];
  readonly nextCursor?: string;
}

/**
 * Контракт поставщика ресурсов одного сервера/домена (например, «issues
 * Трекера» или «страницы Wiki»). Один сервер может зарегистрировать
 * несколько провайдеров (см. `id` — используется как тег семейства курсора
 * и как ключ регистрации в `ResourceRegistry`, обязан быть уникален в
 * пределах сервера).
 */
export interface ResourceProvider {
  /**
   * Стабильный идентификатор провайдера в пределах сервера (например,
   * `tracker-issues`). Используется ResourceRegistry как:
   * (1) ключ регистрации, (2) тег семейства в опаковом курсоре агрегата —
   * защищает от переиспользования курсора, выданного другим провайдером.
   */
  readonly id: string;

  /**
   * Вернуть одну страницу ресурсов. `cursor` — значение `nextCursor`,
   * ранее возвращённое ЭТИМ ЖЕ провайдером (ResourceRegistry гарантирует
   * это инвариант при декодировании курсора агрегата). Провайдер без
   * пагинации может игнорировать `cursor` и всегда возвращать одну полную
   * страницу без `nextCursor`.
   */
  listResources(cursor?: string): Promise<ResourceListPage> | ResourceListPage;

  /**
   * Прочитать содержимое ресурса по URI. `uri` МОЖЕТ отсутствовать в любой
   * странице `listResources` (см. заголовок файла) — провайдер обязан уметь
   * разрешить его напрямую (например, распарсив URI по своей схеме), а не
   * только искать среди уже перечисленных ресурсов.
   *
   * @returns содержимое ресурса, либо `undefined`, если URI этому провайдеру
   *   не принадлежит или не существует — `undefined` НЕ является ошибкой на
   *   уровне провайдера: `ResourceRegistry` опрашивает провайдеров по очереди
   *   и лишь при полном отказе всех бросает `ResourceNotFoundError` (`-32602`).
   */
  readResource(
    uri: string
  ):
    | Promise<readonly McpResourceContents[] | undefined>
    | readonly McpResourceContents[]
    | undefined;

  /** Вернуть полный список шаблонов ресурсов этого провайдера (без пагинации). */
  listTemplates(): Promise<readonly McpResourceTemplate[]> | readonly McpResourceTemplate[];
}
