/**
 * Единственный способ добыть схему параметров инструмента из его класса.
 *
 * Выделен из `redaction-allowlist-validator.ts`, когда второму барьеру
 * (отпечаток схемы в реестре живых наблюдений yandex-tracker) понадобилась та
 * же схема: два разных способа добычи разъезжаются молча, и барьеры начинают
 * говорить о разных объектах, называя их одинаково.
 *
 * Источник — `getDefinition().inputSchema`, то есть ровно то, что видит
 * MCP-клиент, а не Zod-схема до генерации definition.
 */

import { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from './base.types.js';
import type { StaticToolMetadata } from './tool-metadata.js';

/**
 * Минимальный конструктор инструмента, достаточный для чтения его
 * definition. `facade: never` — не сужение по смыслу, а способ дать
 * гетерогенному массиву классов (у каждого инструмента свой `TFacade` в
 * `BaseTool<TFacade>`) пройти structural-проверку присваиваемости: конструктор
 * с более узким типом параметра — подтип конструктора с более широким, а
 * `never` уже любого конкретного `TFacade`. `readToolInputSchema` ниже —
 * единственное место, где сужение снимается обратно, через `{} as never`.
 */
export interface ToolClassLike {
  readonly METADATA: StaticToolMetadata;
  new (facade: never, logger: Logger): { getDefinition(): ToolDefinition };
}

/**
 * Настоящий `Logger` на уровне `silent`, а не структурная заглушка: `Logger` —
 * класс с приватным полем, поэтому объект-заглушка проходил бы только через
 * `as unknown as Logger`, и компилятор перестал бы замечать расхождение с его
 * поверхностью. Уровень `silent` не открывает файлов и не пишет в stderr, а
 * `child()` отдаёт такой же молчаливый логгер — этого требуют инструменты,
 * создающие `this.logger.child(...)` прямо в конструкторе.
 */
let silentLogger: Logger | undefined;

function getSilentLogger(): Logger {
  silentLogger ??= new Logger({ level: 'silent' });
  return silentLogger;
}

/**
 * Инстанцирует инструмент с фасадом-пустышкой и молчаливым логгером и отдаёт
 * его `inputSchema`.
 *
 * Бросок наверх намеренный: инструмент, чью схему прочитать не удалось,
 * классифицирует вызывающий барьер — молча подставленная пустая схема сделала
 * бы любой барьер зелёным там, где он не смог ничего прочитать.
 */
export function readToolInputSchema(ToolClass: ToolClassLike): ToolDefinition['inputSchema'] {
  const instance = new ToolClass({} as never, getSilentLogger());
  return instance.getDefinition().inputSchema;
}
