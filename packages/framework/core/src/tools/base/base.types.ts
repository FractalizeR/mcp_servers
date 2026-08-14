/**
 * Общие типы для базовых абстракций инструментов
 *
 * Этот файл разрывает циркулярную зависимость между base-definition.ts и tool-metadata.ts
 * Содержит только интерфейсы и типы, без реализаций
 */

/**
 * JSON Schema (draft 2020-12), описывающая объект — форма, общая для
 * inputSchema и outputSchema. $ref/$defs допускаются как есть (нужны для
 * рекурсивных/переиспользуемых схем); $schema не предполагается — единственный
 * валидатор входа в проекте — Zod, этот объект используется только как
 * описание контракта наружу.
 */
export interface JsonObjectSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  $defs?: Record<string, unknown>;
}

/**
 * Хинты поведения инструмента для клиента MCP (все — необязательные подсказки,
 * не гарантия: клиент не обязан доверять им при принятии решений о вызове).
 *
 * Классификация по инструментам — работа пакета 3.1.C (следующая волна),
 * поэтому объявлены здесь опциональными: до классификации ни один из 97
 * инструментов их не заполняет.
 */
export interface ToolAnnotations {
  /** Операция не меняет состояние в системе */
  readOnlyHint?: boolean;
  /** Операция разрушающая (удаление, необратимая перезапись) */
  destructiveHint?: boolean;
  /** Повторный вызов с теми же аргументами не меняет результат */
  idempotentHint?: boolean;
  /** Операция обращается во внешний мир (внешний API) */
  openWorldHint?: boolean;
}

/**
 * Определение инструмента для MCP
 */
export interface ToolDefinition {
  /** Уникальное имя инструмента */
  name: string;
  /** Описание функциональности инструмента */
  description: string;
  /** Человекочитаемое имя для UI клиента (опционально, отдельно от name) */
  title?: string;
  /** JSON Schema для валидации входных параметров */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** JSON Schema (2020-12), описывающая structuredContent результата (опционально) */
  outputSchema?: JsonObjectSchema;
  /** Хинты поведения инструмента (readOnly/destructive/idempotent/openWorld) */
  annotations?: ToolAnnotations;
  /** Категория инструмента для группировки */
  category?: string;
  /** Подкатегория для детальной группировки (опционально) */
  subcategory?: string;
  /** Приоритет инструмента для сортировки */
  priority?: 'critical' | 'high' | 'normal' | 'low';
}
