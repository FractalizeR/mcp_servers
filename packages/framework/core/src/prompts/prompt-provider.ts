/**
 * Контракт `PromptProvider` (пакет 5.1.C волны 5.1 плана модернизации MCP
 * 2026-07-28 — механизм prompts готовит пакет 5.1.A framework, сами промпты
 * пишут три параллельных агента серверов).
 *
 * ПРИРОДА ПРОМПТОВ, ОПРЕДЕЛЯЮЩАЯ ФОРМУ ЭТОГО КОНТРАКТА.
 *
 * В клиенте промпт выглядит как слэш-команда: имя, описание, список
 * аргументов. `prompts/get` не ИСПОЛНЯЕТ промпт — он строит и возвращает
 * набор сообщений (`messages`), которые клиент подставляет в диалог с
 * моделью; вызывать инструменты по этим сообщениям — дело клиента и модели,
 * а не сервера. Поэтому `PromptProvider` не содержит никакого "движка
 * исполнения" — только (1) перечисление доступных промптов и (2) чистую
 * функцию построения сообщений по имени и аргументам.
 *
 * Контракт зеркалит `ResourceProvider` (см. resource-provider.ts) —
 * `PromptRegistry.register()` вызывается из composition root каждого
 * сервера тем же паттерном, что и `ToolRegistry`/`ResourceRegistry`.
 *
 * ПАГИНАЦИЯ: НЕ РЕАЛИЗОВАНА НАМЕРЕННО. В отличие от `resources/list`
 * (сотни задач/страниц), состав промптов одной установки — единицы,
 * максимум пара десятков слэш-команд на сервер (см. план, раздел 5.1.C:
 * triage/daily/sprint/epic — Трекер, 2 — Wiki). Спека
 * допускает `prompts/list` без `nextCursor` (курсор в `PaginatedResult`
 * опционален). Если состав вырастет на порядок, `PromptRegistry` можно
 * расширить тем же `OpaqueCursorCodec`, что уже применяет `ResourceRegistry`
 * — механизм рассчитан на переиспользование, но заводить его заранее без
 * реальной необходимости значило бы платить сложностью за гипотетический
 * рост.
 */

/**
 * Один аргумент промпта — поле ввода слэш-команды в клиенте.
 *
 * Форма — точное зеркало `PromptArgument` спеки 2026-07-28: у аргумента
 * НЕТ поля `title` (в отличие от `McpResource`/`McpPrompt` самого верхнего
 * уровня) — так определено в схеме SDK (`PromptArgumentSchema`).
 */
export interface McpPromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/**
 * Один промпт в ответе `prompts/list`.
 */
export interface McpPrompt {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly arguments?: readonly McpPromptArgument[];
}

/** Текстовый content-блок сообщения промпта. */
export interface McpPromptTextContent {
  readonly type: 'text';
  readonly text: string;
}

/**
 * Содержимое одного сообщения промпта.
 *
 * Спека 2026-07-28 допускает в `PromptMessage.content` любой `ContentBlock`
 * (text/image/audio/resource_link/embedded resource) — здесь сознательно
 * ограничено текстом: промпты этой волны (5.1.C) — текстовые инструкции
 * агенту ("вот аргументы, вызови такой-то инструмент с такими-то
 * параметрами"), не мультимедийные шаблоны. Расширить до полного
 * `ContentBlock` можно добавлением новых вариантов в этот union без
 * изменения существующих полей — обратная совместимость сохраняется.
 */
export type McpPromptMessageContent = McpPromptTextContent;

/** Одно сообщение результата `prompts/get`. */
export interface McpPromptMessage {
  readonly role: 'user' | 'assistant';
  readonly content: McpPromptMessageContent;
}

/** Результат построения промпта — то, что возвращает `prompts/get`. */
export interface PromptGetResult {
  readonly description?: string;
  readonly messages: readonly McpPromptMessage[];
}

/**
 * Контракт поставщика промптов одного сервера/домена. Один сервер может
 * зарегистрировать несколько провайдеров с разных доменов (по аналогии с
 * `ResourceProvider`), но типичный случай — один провайдер на сервер со
 * всеми его слэш-командами.
 */
export interface PromptProvider {
  /**
   * Стабильный идентификатор провайдера в пределах сервера (например,
   * `tracker-prompts`). Используется `PromptRegistry` как ключ регистрации
   * и как вторичный ключ детерминированного порядка обхода провайдеров
   * (сортировка по `id`, тот же приём, что и у `ResourceRegistry`).
   */
  readonly id: string;

  /**
   * Полный список промптов этого провайдера (без пагинации — см. заголовок
   * файла). Обязан быть детерминированным между вызовами: `PromptRegistry`
   * НЕ пересортировывает результат — стабильность порядка внутри одного
   * провайдера это обязанность провайдера (типично — литеральный массив
   * фиксированного порядка, не итерация `Map`/`Object.entries` с
   * недетерминированным порядком вставки).
   */
  listPrompts(): Promise<readonly McpPrompt[]> | readonly McpPrompt[];

  /**
   * Построить сообщения промпта `name` с аргументами `args` (все значения —
   * строки, как того требует `GetPromptRequestParams` спеки: клиент шлёт
   * значения полей формы слэш-команды текстом).
   *
   * @returns результат построения, либо `undefined`, если `name` этому
   *   провайдеру не принадлежит — тот же контракт, что и `undefined` у
   *   `ResourceProvider.readResource`: `PromptRegistry` опрашивает
   *   провайдеров по очереди и лишь при отказе всех бросает
   *   `ProtocolError(-32602)`.
   */
  getPrompt(
    name: string,
    args?: Readonly<Record<string, string>>
  ): Promise<PromptGetResult | undefined> | PromptGetResult | undefined;
}
