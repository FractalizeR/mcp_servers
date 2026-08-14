/**
 * Общая форма одного промпта Трекера (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28) — то, что реально пишет каждый файл
 * `*.prompt.ts`: описание слэш-команды (`McpPrompt`, видна в `prompts/list`)
 * плюс чистая функция подстановки аргументов в сообщения (`build`, вызывает
 * `prompts/get`). `TrackerPromptProvider` (см. tracker-prompt-provider.ts)
 * агрегирует массив этой формы в `PromptProvider`.
 *
 * ПРИРОДА ПРОМПТОВ (важно для build): сервер НЕ исполняет промпт — `build`
 * лишь строит текст инструкции агенту («вызови такой-то инструмент с такими
 * параметрами»); вызывать инструменты по этой инструкции — дело клиента и
 * модели после того, как промпт лёг в диалог.
 */

import { ProtocolError } from '@modelcontextprotocol/server';
import type { McpPrompt, PromptGetResult } from '@fractalizer/mcp-core';

export interface TrackerPromptDefinition {
  readonly prompt: McpPrompt;
  build(args: Readonly<Record<string, string>> | undefined): PromptGetResult;
}

/**
 * Провалидировать наличие непустых значений для required-аргументов промпта
 * перед построением сообщений — контракт `PromptProvider.getPrompt` сам
 * ничего не проверяет (framework это осознанно не делает, см. prompt-
 * provider.ts: "чистая функция", без движка исполнения), поэтому обязанность
 * дать агенту внятную ошибку при пропущенном обязательном аргументе лежит на
 * каждом провайдере/промпте.
 *
 * КОД ОШИБКИ — `-32602` (Invalid params), НЕ обычный `Error`. Пропущенный
 * обязательный аргумент — это невалидные параметры вызова `prompts/get`, а не
 * внутренний сбой сервера: `PromptRegistry` (framework) сам превращает в
 * `-32602` только случай «промпт не найден» (см. prompt-registry.ts) — любой
 * `Error`, брошенный отсюда, уехал бы наружу как непрозрачная internal error,
 * и клиент не понял бы, что достаточно передать аргумент. Тот же приём
 * (`ProtocolError(-32602, ...)` вместо `Error`) уже применяет провайдер Wiki
 * в этой же ситуации — здесь используется намеренно тот же код по тем же
 * причинам, а не только "для единообразия".
 *
 * @throws {ProtocolError} код -32602, сообщение перечисляет ВСЕ отсутствующие
 *   required-аргументы сразу (не только первый) — агенту не придётся
 *   исправлять запрос по одному полю.
 */
export function requireArgs(
  prompt: McpPrompt,
  args: Readonly<Record<string, string>> | undefined
): void {
  const required = (prompt.arguments ?? []).filter((a) => a.required === true);
  const missing = required.filter((a) => {
    const value = args?.[a.name];
    return value === undefined || value.trim().length === 0;
  });

  if (missing.length > 0) {
    const names = missing.map((a) => a.name).join(', ');
    throw new ProtocolError(
      -32602,
      `Промпт "${prompt.name}": не указан обязательный аргумент(ы): ${names}. ` +
        `Передайте значение через arguments в prompts/get.`
    );
  }
}
