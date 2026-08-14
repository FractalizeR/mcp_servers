/**
 * PromptRegistry — реестр `PromptProvider` (пакет 5.1.A плана модернизации
 * MCP 2026-07-28), зеркалирует роль `ResourceRegistry`/`ToolRegistry`:
 * composition root каждого сервера регистрирует провайдеров через
 * `register()`, adapter обращается к ЕДИНОМУ реестру в обработчиках
 * `prompts/list`/`prompts/get`.
 *
 * АГРЕГАЦИЯ НЕСКОЛЬКИХ ПРОВАЙДЕРОВ.
 *
 * `prompts/list` — плоская конкатенация списков всех провайдеров в
 * детерминированном порядке (сортировка провайдеров по `id`, тот же приём,
 * что и `ResourceRegistry.orderedProviders()`); порядок ВНУТРИ одного
 * провайдера — обязанность провайдера (см. prompt-provider.ts). Без
 * пагинации — обоснование в заголовке prompt-provider.ts.
 *
 * `prompts/get` опрашивает провайдеров по очереди тем же паттерном, что и
 * `ResourceRegistry.readResource`: `undefined` от провайдера — "не мой
 * промпт", не ошибка; при отказе всех — `ProtocolError(-32602)`.
 */

import { ProtocolError } from '@modelcontextprotocol/server';
import type { PromptProvider, McpPrompt, PromptGetResult } from './prompt-provider.js';

export class PromptRegistry {
  private readonly providers = new Map<string, PromptProvider>();

  /**
   * Зарегистрировать провайдера. `id` обязан быть уникален в пределах
   * реестра; повторная регистрация того же `id` — ошибка конфигурации,
   * а не тихая перезапись (тот же контракт, что у `ResourceRegistry.register`).
   */
  register(provider: PromptProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`PromptProvider с id "${provider.id}" уже зарегистрирован`);
    }
    this.providers.set(provider.id, provider);
  }

  /** Провайдеры в детерминированном порядке (сортировка по id). */
  private orderedProviders(): PromptProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Полный список промптов всех провайдеров (конкатенация в порядке
   * провайдеров, без пагинации — см. prompt-provider.ts). Пустой реестр
   * отвечает пустым списком, а не ошибкой — три существующих `server.ts`
   * пока не регистрируют ни одного `PromptProvider`.
   */
  async listPrompts(): Promise<readonly McpPrompt[]> {
    const all: McpPrompt[] = [];
    for (const provider of this.orderedProviders()) {
      all.push(...(await provider.listPrompts()));
    }
    return all;
  }

  /**
   * Построить сообщения промпта `name`. Опрашивает провайдеров по очереди;
   * при отказе всех — `ProtocolError(-32602)`.
   *
   * ПОЧЕМУ -32602, А НЕ ОТДЕЛЬНЫЙ КОД. SDK не экспортирует
   * `PromptNotFoundError` (в отличие от `ResourceNotFoundError`) — проверено
   * по экспортам `@modelcontextprotocol/server`. Зато собственный встроенный
   * `McpServer.setPromptRequestHandlers()` (высокоуровневая обёртка того же
   * SDK, `dist/mcp-*.mjs`) на отсутствующий промпт бросает ровно
   * `new ProtocolError(ProtocolErrorCode.InvalidParams, ...)`, то есть
   * `-32602` — тот же код, что несёт `ResourceNotFoundError` (она сама
   * реализована как `ProtocolError(InvalidParams, ...)`, см. комментарий в
   * resource-registry.test.ts и исходники SDK). Используем тот же код
   * напрямую через `ProtocolError`, не заводя собственный класс ошибки —
   * двойной прецедент (код `ResourceNotFoundError` и код встроенного
   * обработчика prompts/get) сильнее одного эмпирического наблюдения.
   */
  async getPrompt(name: string, args?: Readonly<Record<string, string>>): Promise<PromptGetResult> {
    for (const provider of this.orderedProviders()) {
      const result = await provider.getPrompt(name, args);
      if (result !== undefined) {
        return result;
      }
    }
    throw new ProtocolError(-32602, `Промпт "${name}" не найден`);
  }
}
