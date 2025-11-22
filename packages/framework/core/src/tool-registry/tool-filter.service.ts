/**
 * Сервис для фильтрации инструментов
 *
 * Ответственность (SRP):
 * - Фильтрация tools по категориям и подкатегориям
 * - Применение позитивных и негативных фильтров
 * - Валидация запрошенных категорий
 * - Логирование фильтрации
 */

import type { Logger, ParsedCategoryFilter } from '@mcp-framework/infrastructure';
import type { BaseTool } from '../tools/base/index.js';

/**
 * Сервис для фильтрации tools
 */
export class ToolFilterService {
  constructor(private readonly logger: Logger) {}

  /**
   * Фильтрация по категориям (позитивный фильтр)
   *
   * @param tools - Массив tools
   * @param filter - Фильтр категорий
   * @returns Отфильтрованный массив
   */
  filterByCategories(tools: BaseTool[], filter: ParsedCategoryFilter): BaseTool[] {
    // Если includeAll = true, возвращаем все инструменты
    if (filter.includeAll) {
      return tools;
    }

    // Валидация запрошенных категорий
    this.validateCategories(tools, filter);

    // Фильтрация
    const filtered = tools.filter((tool) => {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!metadata?.category) {
        // Инструменты без категории всегда включены (backwards compatibility)
        return true;
      }

      const category = metadata.category;
      const subcategory = metadata.subcategory;

      // Проверка 1: категория без подкатегории (включает все подкатегории)
      if (filter.categories.has(category)) {
        return true;
      }

      // Проверка 2: категория с конкретными подкатегориями
      if (subcategory && filter.categoriesWithSubcategories.has(category)) {
        const allowedSubcategories = filter.categoriesWithSubcategories.get(category);
        if (allowedSubcategories) {
          return allowedSubcategories.has(subcategory);
        }
      }

      return false;
    });

    // Логирование фильтрации
    this.logger.info('Tools filtered by categories', {
      totalTools: tools.length,
      filteredTools: filtered.length,
      categories: Array.from(filter.categories),
      categoriesWithSubcategories: Array.from(filter.categoriesWithSubcategories.entries()).map(
        ([cat, subcats]) => ({ category: cat, subcategories: Array.from(subcats) })
      ),
    });

    return filtered;
  }

  /**
   * Применить негативный фильтр (исключение отключенных групп)
   *
   * @param tools - Список инструментов
   * @param disabledFilter - Фильтр отключенных категорий/подкатегорий
   * @returns Отфильтрованный список инструментов
   */
  applyDisabledFilter(tools: BaseTool[], disabledFilter: ParsedCategoryFilter): BaseTool[] {
    const filtered = tools.filter((tool) => {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!metadata?.category) {
        // Инструменты без категории всегда включены
        return true;
      }

      const category = metadata.category;
      const subcategory = metadata.subcategory;

      // Проверка 1: категория полностью отключена
      if (disabledFilter.categories.has(category)) {
        return false;
      }

      // Проверка 2: подкатегория отключена
      if (subcategory && disabledFilter.categoriesWithSubcategories.has(category)) {
        const disabledSubcategories = disabledFilter.categoriesWithSubcategories.get(category);
        if (disabledSubcategories?.has(subcategory)) {
          return false;
        }
      }

      return true;
    });

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
  // eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity, max-statements
  private validateCategories(tools: BaseTool[], filter: ParsedCategoryFilter): void {
    // Собираем известные категории и подкатегории
    const knownCategories = new Set<string>();
    const knownSubcategories = new Map<string, Set<string>>();

    for (const tool of tools) {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
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
