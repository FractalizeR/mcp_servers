/**
 * Барьер соответствия `METADATA.redactionAllowlist` схеме параметров
 * инструмента.
 *
 * Каждый ключ allow-list обязан называть параметр, реально существующий в
 * `getDefinition().inputSchema` инструмента, на любой глубине вложенности —
 * `redactParams` (`../../tool-registry/params-redactor.ts`) раскрывает
 * allow-listed ключи независимо от уровня вложенности, поэтому сверка по
 * составу верхнего уровня схемы объявила бы ошибкой законные вложенные
 * допуски (например, `issueId` внутри `comments[]` у `add_comment`).
 *
 * **Что барьер обещает:** ни один ключ allow-list не назван по ошибке —
 * опечатка, переименованный параметр или допуск, переживший удаление
 * параметра из схемы, роняют проверку.
 *
 * **Чего барьер НЕ проверяет** (граница названа, чтобы зелёный результат не
 * читался шире, чем он есть):
 * - **тип допущенного параметра.** Сверяется только ИМЯ ключа. Допуск на
 *   параметр со свободным пользовательским текстом пройдёт зелёным, хотя
 *   именно такой параметр редактор и обязан скрывать; инертный допуск на
 *   параметр, который редактор и так не трогает, — тоже. Осмысленность
 *   каждого допуска проверяет ревью и, для серверов, где он заведён,
 *   `tests/smoke/tool-redaction-allowlist.smoke.test.ts`.
 * - **обратное направление** (параметр схемы отсутствует в allow-list):
 *   не быть в allow-list — штатное состояние параметра с пользовательским
 *   текстом, ради которого редактор и заведён.
 * - **путь до параметра.** Совпадение имени на ЛЮБОЙ глубине принимается за
 *   существование ключа: одноимённые параметры в разных ветках схемы барьер
 *   не различает, как не различает их и сам `redactParams`.
 *
 * Схема добывается общим `readToolInputSchema` (`./tool-input-schema.ts`) — тем
 * же, которым пользуется отпечаток схемы: второй способ добычи разъехался бы с
 * первым молча.
 */

import type { ToolDefinition } from './base.types.js';
import { readToolInputSchema } from './tool-input-schema.js';
import type { ToolClassLike } from './tool-input-schema.js';

interface SchemaWalkContext {
  readonly defs: Record<string, unknown>;
  readonly out: Set<string>;
  /** Уже разрешённые `$ref` — рекурсивная схема иначе зацикливает обход. */
  readonly visitedRefs: Set<string>;
}

/** @returns `true`, если узел был `$ref`: рядом с ним ключей нет, дальше идти некуда. */
function walkRef(obj: Record<string, unknown>, ctx: SchemaWalkContext): boolean {
  const ref = obj['$ref'];
  if (typeof ref !== 'string') {
    return false;
  }
  if (!ctx.visitedRefs.has(ref)) {
    ctx.visitedRefs.add(ref);
    const defName = ref.replace(/^#\/\$defs\//, '');
    collectSchemaKeys(ctx.defs[defName], ctx);
  }
  return true;
}

/** Единственный источник самих имён: остальные обходчики только доводят рекурсию до вложенных `properties`. */
function walkProperties(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  const properties = obj['properties'];
  if (typeof properties !== 'object' || properties === null) {
    return;
  }
  for (const [key, propSchema] of Object.entries(properties as Record<string, unknown>)) {
    ctx.out.add(key);
    collectSchemaKeys(propSchema, ctx);
  }
}

/**
 * `items` в форме массива схем — устаревший (draft-07) способ описать tuple.
 * Zod 4 так уже не кодирует (см. `walkPrefixItems`), но схема, пришедшая не от
 * Zod, — законный вход барьера.
 */
function walkItems(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  const items = obj['items'];
  if (Array.isArray(items)) {
    items.forEach((item) => collectSchemaKeys(item, ctx));
  } else if (typeof items === 'object' && items !== null) {
    collectSchemaKeys(items, ctx);
  }
}

/**
 * Форма tuple в draft 2020-12 — именно её выдаёт `z.tuple()` под Zod 4. Без
 * этого обходчика допуск на параметр внутри кортежа объявлялся бы
 * несуществующим (ложный красный).
 */
function walkPrefixItems(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  const prefixItems = obj['prefixItems'];
  if (Array.isArray(prefixItems)) {
    prefixItems.forEach((item) => collectSchemaKeys(item, ctx));
  }
}

/** Ключ допуска может жить только в одной ветке — совпадение хотя бы с одной считается существованием. */
function walkCompositions(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  for (const branchKey of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branches = obj[branchKey];
    if (Array.isArray(branches)) {
      branches.forEach((branch) => collectSchemaKeys(branch, ctx));
    }
  }
}

/** Схема значений `z.record()`; булев `additionalProperties` схемой не является и отсеивается typeof. */
function walkAdditionalProperties(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  const additionalProperties = obj['additionalProperties'];
  if (typeof additionalProperties === 'object' && additionalProperties !== null) {
    collectSchemaKeys(additionalProperties, ctx);
  }
}

/**
 * `patternProperties` этот Zod не порождает (record выходит через
 * `additionalProperties`), но `inputSchema` не обязан приходить от Zod.
 * Сами паттерны именами параметров не считаются: конкретное имя ключа
 * неизвестно до вызова, и объявить регулярку существующим параметром значило
 * бы принять любой допуск.
 */
function walkPatternProperties(obj: Record<string, unknown>, ctx: SchemaWalkContext): void {
  const patternProperties = obj['patternProperties'];
  if (typeof patternProperties !== 'object' || patternProperties === null) {
    return;
  }
  for (const propSchema of Object.values(patternProperties as Record<string, unknown>)) {
    collectSchemaKeys(propSchema, ctx);
  }
}

/**
 * Перечень обходимых форм — область действия барьера: форма, которой здесь
 * нет, даёт ложный красный (ключ есть в схеме, но обход его не увидел), а не
 * ложный зелёный. Направление отказа безопасное, поэтому новая форма JSON
 * Schema добавляется сюда по факту встречи, а не превентивно.
 */
function collectSchemaKeys(node: unknown, ctx: SchemaWalkContext): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }
  const obj = node as Record<string, unknown>;

  if (walkRef(obj, ctx)) {
    return;
  }

  walkProperties(obj, ctx);
  walkItems(obj, ctx);
  walkPrefixItems(obj, ctx);
  walkCompositions(obj, ctx);
  walkAdditionalProperties(obj, ctx);
  walkPatternProperties(obj, ctx);
}

function collectAllSchemaKeys(inputSchema: ToolDefinition['inputSchema']): Set<string> {
  const out = new Set<string>();
  const defs = (inputSchema as { $defs?: Record<string, unknown> }).$defs ?? {};
  collectSchemaKeys(inputSchema, { defs, out, visitedRefs: new Set() });
  return out;
}

/**
 * Проверяет каждый инструмент из `toolClasses`: если `METADATA.redactionAllowlist`
 * непуст, каждый его ключ обязан существовать в составе схемы параметров
 * инструмента (на любой глубине). Пустой allow-list — законный пропуск без
 * ошибки, сверять нечего.
 *
 * Схема, которая не читается (инстанцирование или `getDefinition()` бросают),
 * классифицируется по тому же правилу: ошибка при непустом allow-list —
 * барьер, отчитывающийся зелёным там, где не смог прочитать состав, не
 * барьер, — пропуск при пустом. Схема, которая читается, но не даёт ни
 * одного ключа при непустом allow-list, — та же ошибка: `redactParams`
 * заведомо не может сверять с пустым составом.
 *
 * @returns список сообщений об ошибках, каждое называет инструмент и ключ;
 *   пустой массив, когда расхождений нет.
 */
export function validateRedactionAllowlist(toolClasses: readonly ToolClassLike[]): string[] {
  const errors: string[] = [];

  for (const ToolClass of toolClasses) {
    const allowlist = ToolClass.METADATA.redactionAllowlist ?? [];
    if (allowlist.length === 0) {
      continue;
    }

    const toolName = ToolClass.METADATA.name;

    let inputSchema: ToolDefinition['inputSchema'];
    try {
      inputSchema = readToolInputSchema(ToolClass);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(
        `${toolName}: не удалось прочитать схему параметров, а redactionAllowlist непуст ` +
          `(${allowlist.join(', ')}); ошибка: ${message}`
      );
      continue;
    }

    const schemaKeys = collectAllSchemaKeys(inputSchema);
    if (schemaKeys.size === 0) {
      errors.push(
        `${toolName}: состав схемы параметров пуст, а redactionAllowlist непуст ` +
          `(${allowlist.join(', ')})`
      );
      continue;
    }

    for (const key of allowlist) {
      if (!schemaKeys.has(key)) {
        errors.push(
          `${toolName}: redactionAllowlist содержит ключ "${key}", отсутствующий в схеме параметров`
        );
      }
    }
  }

  return errors;
}
