/**
 * Базовая абстракция для определений MCP инструментов
 *
 * Отвечает за описание tool для MCP SDK:
 * - Имя и описание инструмента
 * - JSON Schema для валидации параметров
 * - Примеры использования для ИИ агента
 */

/**
 * Определение инструмента для MCP
 */
export interface ToolDefinition {
  /** Уникальное имя инструмента */
  name: string;
  /** Описание функциональности инструмента */
  description: string;
  /** JSON Schema для валидации входных параметров */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Базовый класс для построения определений инструментов
 *
 * Предоставляет helper методы для создания JSON Schema параметров
 */
export abstract class BaseToolDefinition {
  /**
   * Построить определение инструмента
   */
  abstract build(): ToolDefinition;

  /**
   * Создать описание строкового параметра
   */
  protected buildStringParam(
    description: string,
    options?: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      examples?: string[];
    }
  ): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      type: 'string',
      description,
    };

    if (options?.pattern) {schema['pattern'] = options.pattern;}
    if (options?.minLength !== undefined) {schema['minLength'] = options.minLength;}
    if (options?.maxLength !== undefined) {schema['maxLength'] = options.maxLength;}
    if (options?.examples) {schema['examples'] = options.examples;}

    return schema;
  }

  /**
   * Создать описание числового параметра
   */
  protected buildNumberParam(
    description: string,
    options?: {
      minimum?: number;
      maximum?: number;
      examples?: number[];
    }
  ): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      type: 'number',
      description,
    };

    if (options?.minimum !== undefined) {schema['minimum'] = options.minimum;}
    if (options?.maximum !== undefined) {schema['maximum'] = options.maximum;}
    if (options?.examples) {schema['examples'] = options.examples;}

    return schema;
  }

  /**
   * Создать описание массива
   */
  protected buildArrayParam(
    description: string,
    itemSchema: Record<string, unknown>,
    options?: {
      minItems?: number;
      maxItems?: number;
      examples?: unknown[];
    }
  ): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      type: 'array',
      description,
      items: itemSchema,
    };

    if (options?.minItems !== undefined) {schema['minItems'] = options.minItems;}
    if (options?.maxItems !== undefined) {schema['maxItems'] = options.maxItems;}
    if (options?.examples) {schema['examples'] = options.examples;}

    return schema;
  }

  /**
   * Создать описание enum параметра
   */
  protected buildEnumParam<T extends string>(
    description: string,
    values: T[],
    options?: {
      examples?: T[];
    }
  ): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      type: 'string',
      description,
      enum: values,
    };

    if (options?.examples) {schema['examples'] = options.examples;}

    return schema;
  }

  /**
   * Создать описание булевого параметра
   */
  protected buildBooleanParam(description: string): Record<string, unknown> {
    return {
      type: 'boolean',
      description,
    };
  }
}
