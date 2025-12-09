/**
 * Утилита для построения динамического индекса из ToolRegistry
 *
 * Responsibilities:
 * - Извлечение метаданных из всех зарегистрированных tools
 * - Токенизация имен и описаний
 * - Создание StaticToolIndex[] для ToolSearchEngine
 *
 * Преимущества динамического подхода:
 * - Автоматическая синхронизация с ToolRegistry
 * - Нет необходимости в compile-time генерации
 * - Всегда актуальные имена инструментов
 */

import type { ToolRegistry } from '@fractalizer/mcp-core';
import type { StaticToolIndex } from '../types.js';

/**
 * Токенизация текста
 *
 * - Приведение к lowercase
 * - Замена разделителей на пробелы
 * - Разбиение по non-word символам
 * - Удаление пустых токенов
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .split(/\W+/)
    .filter((token) => token.length > 0);
}

/**
 * Получить краткое описание (первое предложение)
 */
function getShortDescription(description: string): string {
  const firstSentence = description.split(/[.!?]/)[0];
  return firstSentence ? firstSentence.trim() : description;
}

/**
 * Построить динамический индекс из ToolRegistry
 *
 * @param toolRegistry - Реестр инструментов
 * @returns Статический индекс для ToolSearchEngine
 *
 * @example
 * const toolRegistry = container.get<ToolRegistry>(Symbol.for('ToolRegistry'));
 * const index = buildIndexFromRegistry(toolRegistry);
 * const searchEngine = new ToolSearchEngine(index, toolRegistry, strategy);
 */
export function buildIndexFromRegistry(toolRegistry: ToolRegistry): StaticToolIndex[] {
  const index: StaticToolIndex[] = [];

  // Получаем все tools из registry
  const tools = toolRegistry.getAllTools();

  for (const tool of tools) {
    const metadata = tool.getMetadata();
    const definition = metadata.definition;

    // Валидация данных
    if (!definition.name || typeof definition.name !== 'string') {
      console.warn(`Tool ${tool.constructor.name}: invalid name, skipping`);
      continue;
    }

    if (!definition.description || typeof definition.description !== 'string') {
      console.warn(`Tool ${definition.name}: invalid description, skipping`);
      continue;
    }

    if (!metadata.category) {
      console.warn(`Tool ${definition.name}: missing category, skipping`);
      continue;
    }

    // Создаем индексную запись
    index.push({
      name: definition.name,
      category: metadata.category,
      tags: metadata.tags ? Array.from(metadata.tags) : [],
      isHelper: metadata.isHelper ?? false,
      nameTokens: tokenize(definition.name),
      descriptionTokens: tokenize(definition.description),
      descriptionShort: getShortDescription(definition.description),
    });
  }

  return index;
}
