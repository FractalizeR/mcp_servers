/**
 * Сервис для фильтрации инструментов
 *
 * Ответственность (SRP):
 * - Применение негативного фильтра (отключённые группы, DISABLED_TOOL_GROUPS)
 * - Валидация запрошенных категорий/подкатегорий
 * - Логирование фильтрации
 *
 * Позитивный фильтр (ENABLED_TOOL_CATEGORIES) удалён вместе с lazy discovery:
 * единственный оставшийся рубильник — негативный список отключённых групп.
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { BaseTool } from '../tools/base/index.js';
import type { ParsedCategoryFilter } from './types.js';

/**
 * Сервис для фильтрации tools
 */
export class ToolFilterService {
  constructor(private readonly logger: Logger) {}

  /**
   * Негативная проверка: исключён ли один tool фильтром отключённых групп
   *
   * Чистая функция без побочных эффектов — специально для переиспользования
   * вне контекста построения полного списка (см. ToolAccessPolicy), где нужен
   * вердикт по одному инструменту, а не отфильтрованный массив.
   *
   * ЕДИНЫЙ источник истины: {@link applyDisabledFilter} и `ToolAccessPolicy`
   * обязаны использовать именно этот метод, чтобы решение о видимости в
   * tools/list и решение о доступности в tools/call не могли разойтись.
   *
   * @param tool - Проверяемый tool
   * @param disabledFilter - Фильтр отключённых категорий/подкатегорий
   * @returns true, если tool должен быть исключён
   */
  static isDisabledByFilter(tool: BaseTool, disabledFilter: ParsedCategoryFilter): boolean {
    const toolClass = tool.constructor as typeof BaseTool;
    const metadata = toolClass.METADATA;

    if (!metadata?.category) {
      // Инструменты без категории никогда не отключаются
      return false;
    }

    const category = metadata.category;
    const subcategory = metadata.subcategory;

    // Проверка 1: категория полностью отключена
    if (disabledFilter.categories.has(category)) {
      return true;
    }

    // Проверка 2: подкатегория отключена
    if (subcategory && disabledFilter.categoriesWithSubcategories.has(category)) {
      const disabledSubcategories = disabledFilter.categoriesWithSubcategories.get(category);
      if (disabledSubcategories?.has(subcategory)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Применить негативный фильтр (исключение отключенных групп)
   *
   * Валидирует имена категорий/подкатегорий из фильтра ПЕРЕД применением:
   * опечатка или неизвестная группа не должна молчать — см. {@link validateCategories}.
   *
   * @param tools - Список инструментов
   * @param disabledFilter - Фильтр отключенных категорий/подкатегорий
   * @returns Отфильтрованный список инструментов
   */
  applyDisabledFilter(tools: BaseTool[], disabledFilter: ParsedCategoryFilter): BaseTool[] {
    // Валидация запрошенных категорий (warn в stderr+файл для неизвестных имён)
    this.validateCategories(tools, disabledFilter);

    // Единая логика — см. ToolFilterService.isDisabledByFilter
    const filtered = tools.filter(
      (tool) => !ToolFilterService.isDisabledByFilter(tool, disabledFilter)
    );

    // Логирование отключенных групп
    this.logger.info('✂️  Применён фильтр отключенных групп', {
      disabledCategories: Array.from(disabledFilter.categories),
      disabledCategoriesWithSubcategories: Array.from(
        disabledFilter.categoriesWithSubcategories.entries()
      ).map(([cat, subcats]) => ({
        category: cat,
        subcategories: Array.from(subcats),
      })),
      totalToolsAfterFilter: filtered.length,
    });

    return filtered;
  }

  /**
   * Валидация запрошенных категорий
   *
   * Логирует warnings для неизвестных категорий/подкатегорий
   *
   * @param tools - Массив tools
   * @param filter - Фильтр категорий
   */
  // eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity
  private validateCategories(tools: BaseTool[], filter: ParsedCategoryFilter): void {
    // Собираем известные категории и подкатегории
    const knownCategories = new Set<string>();
    const knownSubcategories = new Map<string, Set<string>>();

    for (const tool of tools) {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

      if (metadata && metadata.category) {
        knownCategories.add(metadata.category);

        if (metadata.subcategory) {
          let subcategories = knownSubcategories.get(metadata.category);
          if (!subcategories) {
            subcategories = new Set();
            knownSubcategories.set(metadata.category, subcategories);
          }
          subcategories.add(metadata.subcategory);
        }
      }
    }

    // Валидация запрошенных категорий
    const unknownCategories: string[] = [];
    const unknownSubcategories: Array<{ category: string; subcategory: string }> = [];

    for (const cat of filter.categories) {
      if (!knownCategories.has(cat)) {
        unknownCategories.push(cat);
      }
    }

    for (const [cat, subcats] of filter.categoriesWithSubcategories.entries()) {
      if (!knownCategories.has(cat)) {
        unknownCategories.push(cat);
      } else {
        for (const subcat of subcats) {
          if (!knownSubcategories.get(cat)?.has(subcat)) {
            unknownSubcategories.push({ category: cat, subcategory: subcat });
          }
        }
      }
    }

    // Логируем warnings для неизвестных категорий/подкатегорий
    if (unknownCategories.length > 0) {
      this.logger.warn('⚠️  Unknown categories in filter', {
        unknownCategories: [...new Set(unknownCategories)],
        knownCategories: Array.from(knownCategories),
      });
    }

    if (unknownSubcategories.length > 0) {
      this.logger.warn('⚠️  Unknown subcategories in filter', {
        unknownSubcategories,
        knownSubcategories: Array.from(knownSubcategories.entries()).map(([cat, subcats]) => ({
          category: cat,
          subcategories: Array.from(subcats),
        })),
      });
    }
  }
}
