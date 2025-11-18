/**
 * Метаданные инструментов для поиска и категоризации
 *
 * Responsibilities:
 * - Описание категорий и тегов tools
 * - Типы для compile-time индексации
 * - Структура метаданных для поиска
 */

import type { ToolDefinition } from './base-definition.js';

/**
 * Категории инструментов
 *
 * Используются для группировки и фильтрации
 */
export enum ToolCategory {
  // API операции
  ISSUES = 'issues',
  QUEUES = 'queues',
  USERS = 'users',
  PROJECTS = 'projects',
  BOARDS = 'boards',
  SPRINTS = 'sprints',
  COMMENTS = 'comments',
  CHECKLISTS = 'checklists',
  COMPONENTS = 'components',

  // Системные инструменты
  SYSTEM = 'system',

  // Helper инструменты
  HELPERS = 'helpers',
  SEARCH = 'search',
  URL_GENERATION = 'url-generation',
  VALIDATION = 'validation',
  DEMO = 'demo',
}

/**
 * Приоритеты инструментов для сортировки
 *
 * Используются для определения порядка отображения tools в MCP
 */
export enum ToolPriority {
  /** Критически важные инструменты (показываются первыми) */
  CRITICAL = 'critical',
  /** Высокий приоритет (часто используемые) */
  HIGH = 'high',
  /** Нормальный приоритет (по умолчанию) */
  NORMAL = 'normal',
  /** Низкий приоритет (редко используемые) */
  LOW = 'low',
}

/**
 * Метаданные инструмента для поиска
 *
 * Расширяет ToolDefinition дополнительной информацией
 */
export interface ToolMetadata {
  /** Базовое определение (name, description, inputSchema) */
  definition: ToolDefinition;

  /** Категория инструмента */
  category: ToolCategory;

  /** Подкатегория для детальной группировки (опционально) */
  subcategory?: string;

  /** Приоритет инструмента для сортировки (по умолчанию: NORMAL) */
  priority?: ToolPriority;

  /** Теги для поиска */
  tags: readonly string[];

  /** Примеры использования (для подсказок модели) */
  examples?: readonly string[];

  /** Является ли tool helper'ом (не API операция) */
  isHelper: boolean;
}

/**
 * Статические метаданные для compile-time индексации
 *
 * Используется в:
 * - BaseTool.METADATA (статическое свойство)
 * - scripts/generate-tool-index.ts (генерация индекса)
 */
export interface StaticToolMetadata {
  /** Имя инструмента */
  name: string;

  /** Описание инструмента */
  description: string;

  /** Категория */
  category: ToolCategory;

  /** Подкатегория для детальной группировки (опционально) */
  subcategory?: string;

  /** Приоритет инструмента для сортировки (по умолчанию: NORMAL) */
  priority?: ToolPriority;

  /** Теги для поиска */
  tags: readonly string[];

  /** Helper или API tool */
  isHelper: boolean;

  /** Примеры использования (опционально) */
  examples?: readonly string[];

  /**
   * Флаг "опасной" операции, изменяющей данные пользователя
   *
   * Если true:
   * - В description автоматически добавляется предупреждение для ИИ агента
   * - SearchToolsTool помечает такие tools в результатах
   * - npm run validate:tools проверяет корректность флага
   *
   * Используй для:
   * - Изменения задач (update, transition)
   * - Создания/удаления сущностей (create, delete)
   * - Любых необратимых операций
   *
   * НЕ используй для:
   * - Read-only операций (get, find, search, list)
   * - Helper tools (url-generation, search)
   *
   * @default false
   */
  requiresExplicitUserConsent?: boolean;
}
