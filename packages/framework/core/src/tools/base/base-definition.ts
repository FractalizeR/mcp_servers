/**
 * Базовая абстракция для определений MCP инструментов
 *
 * Отвечает за описание tool для MCP SDK:
 * - Имя и описание инструмента
 * - JSON Schema для валидации параметров
 * - Примеры использования для ИИ агента
 */

import type { StaticToolMetadata } from './tool-metadata.js';
import { SafetyWarningBuilder } from '../common/utils/index.js';

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
  /** Категория инструмента для группировки */
  category?: string;
  /** Подкатегория для детальной группировки (опционально) */
  subcategory?: string;
  /** Приоритет инструмента для сортировки */
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

/**
 * Базовый класс для построения определений инструментов
 *
 * Предоставляет helper методы для создания JSON Schema параметров
 * и автоматического добавления предупреждений безопасности
 */
export abstract class BaseToolDefinition {
  /**
   * Построить определение инструмента
   */
  abstract build(): ToolDefinition;

  /**
   * Получить статические метаданные из наследника
   *
   * Используется для:
   * - Проверки флага requiresExplicitUserConsent
   * - Автоматического добавления предупреждений безопасности
   * - Получения имени инструмента (Single Source of Truth)
   *
   * @returns Метаданные из статического свойства METADATA наследника
   */
  protected abstract getStaticMetadata(): StaticToolMetadata;

  /**
   * Получить имя инструмента из метаданных (Single Source of Truth)
   *
   * Имя определяется ОДИН РАЗ в Tool.METADATA.name и переиспользуется везде.
   * НЕ дублируйте имя в Definition.build() - используйте этот метод!
   *
   * @returns Полное имя инструмента (с префиксом, если он был добавлен в Tool.METADATA)
   *
   * @example
   * // В Definition классе:
   * build(): ToolDefinition {
   *   return {
   *     name: this.getToolName(), // ✅ Переиспользуем из Tool.METADATA
   *     description: '...',
   *     inputSchema: { ... },
   *   };
   * }
   */
  protected getToolName(): string {
    return this.getStaticMetadata().name;
  }

  /**
   * Получить название системы для предупреждений безопасности
   *
   * Переопределите этот метод в наследнике для указания конкретной системы.
   * По умолчанию возвращает 'системе' (универсальное название).
   *
   * @returns Название системы (например, 'Яндекс.Трекере', 'GitHub', 'Jira')
   *
   * @example
   * // В yandex-tracker пакете:
   * protected getSystemName(): string {
   *   return 'Яндекс.Трекере';
   * }
   */
  protected getSystemName(): string {
    return 'системе';
  }

  /**
   * Обернуть description предупреждением безопасности
   *
   * Автоматически добавляет предупреждение для ИИ агента если
   * requiresExplicitUserConsent === true в метаданных
   *
   * @param description - Оригинальное описание инструмента
   * @returns Описание с предупреждением (если требуется)
   */
  protected wrapWithSafetyWarning(description: string): string {
    const metadata = this.getStaticMetadata();
    return SafetyWarningBuilder.addWarningToDescription(
      description,
      metadata.requiresExplicitUserConsent,
      this.getSystemName()
    );
  }

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

    if (options?.pattern) {
      schema['pattern'] = options.pattern;
    }
    if (options?.minLength !== undefined) {
      schema['minLength'] = options.minLength;
    }
    if (options?.maxLength !== undefined) {
      schema['maxLength'] = options.maxLength;
    }
    if (options?.examples) {
      schema['examples'] = options.examples;
    }

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

    if (options?.minimum !== undefined) {
      schema['minimum'] = options.minimum;
    }
    if (options?.maximum !== undefined) {
      schema['maximum'] = options.maximum;
    }
    if (options?.examples) {
      schema['examples'] = options.examples;
    }

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

    if (options?.minItems !== undefined) {
      schema['minItems'] = options.minItems;
    }
    if (options?.maxItems !== undefined) {
      schema['maxItems'] = options.maxItems;
    }
    if (options?.examples) {
      schema['examples'] = options.examples;
    }

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

    if (options?.examples) {
      schema['examples'] = options.examples;
    }

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
