/**
 * Проекция ToolDefinition[] → форма ответа MCP tools/list
 *
 * Единственное место в кодовой базе, решающее, какие поля ToolDefinition
 * попадают наружу в протокольный ответ tools/list. Раньше каждый из трёх
 * серверов (yandex-tracker, yandex-wiki, ticktick) строил этот объект
 * самостоятельно в своём server.ts (`tools: definitions.map(...)`) — три
 * копии одной и той же проекции неизбежно расходились бы при добавлении
 * новых полей ToolDefinition (title, outputSchema, annotations — пакет 3.1.B).
 * server.ts каждого сервера обязан вызывать эту функцию, а не собирать
 * объект сам.
 */

import type { ToolDefinition } from '../tools/base/index.js';

/**
 * Форма одного элемента массива `tools` в ответе tools/list.
 *
 * Контракт для следующей волны (3.1.C/D): поля title/outputSchema/annotations
 * опциональны и пропускаются наружу только когда заданы в ToolDefinition —
 * пока (до 3.1.C) их нет ни у одного из 97 инструментов.
 *
 * `_meta` добавлено пакетом 6.2 (снятие ограничения пилота MCP Apps): хост
 * узнаёт о `_meta.ui.resourceUri` инструмента именно из `tools/list` (SEP-1865,
 * «hosts can prefetch templates before tool execution») — до этого поле
 * терялось на границе адаптера, т.к. в whitelist не входило. Явное поле в
 * whitelist, не копирование всего объекта — тот же принцип, что и у
 * title/outputSchema/annotations выше.
 */
export interface McpToolListEntry {
  name: string;
  description: string;
  inputSchema: ToolDefinition['inputSchema'];
  title?: string;
  outputSchema?: ToolDefinition['outputSchema'];
  annotations?: ToolDefinition['annotations'];
  _meta?: ToolDefinition['_meta'];
}

/**
 * Спроецировать один ToolDefinition в форму ответа tools/list.
 */
function projectToolDefinitionForList(definition: ToolDefinition): McpToolListEntry {
  const entry: McpToolListEntry = {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
  };

  if (definition.title !== undefined) {
    entry.title = definition.title;
  }
  if (definition.outputSchema !== undefined) {
    entry.outputSchema = definition.outputSchema;
  }
  if (definition.annotations !== undefined) {
    entry.annotations = definition.annotations;
  }
  if (definition._meta !== undefined) {
    entry._meta = definition._meta;
  }

  return entry;
}

/**
 * Спроецировать список ToolDefinition в массив `tools` ответа tools/list.
 *
 * @param definitions - определения инструментов (обычно результат
 *   `ToolRegistry.getDefinitions()`)
 */
export function projectToolDefinitionsForList(
  definitions: readonly ToolDefinition[]
): McpToolListEntry[] {
  return definitions.map(projectToolDefinitionForList);
}
