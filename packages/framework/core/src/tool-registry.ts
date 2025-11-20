/**
 * Реестр всех MCP инструментов
 *
 * Ответственность (SRP):
 * - Регистрация инструментов
 * - Получение списка определений
 * - Маршрутизация вызовов к нужному инструменту
 *
 * АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ (Open/Closed Principle):
 * - Tools автоматически извлекаются из DI контейнера
 * - Для добавления нового tool: передай класс в toolClasses конструктора
 * - НЕ нужно модифицировать этот файл при добавлении новых tools
 */

import type { Container } from 'inversify';
import type {
  Logger,
  ToolCallParams,
  ToolResult,
  ParsedCategoryFilter,
} from '@mcp-framework/infrastructure';
import type { BaseTool, ToolDefinition } from './tools/base/index.js';

/**
 * Конструктор класса Tool для DI
 */
export interface ToolConstructor {
  new (...args: any[]): BaseTool<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string;
}

/**
 * Реестр инструментов
 *
 * Централизованное управление всеми инструментами проекта
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> | null = null; // Lazy initialization
  private readonly container: Container;
  private readonly logger: Logger;
  private readonly toolClasses: readonly ToolConstructor[];

  /**
   * @param container - DI контейнер с зарегистрированными tools
   * @param logger - Logger для логирования
   * @param toolClasses - Список классов tools для регистрации
   */
  constructor(container: Container, logger: Logger, toolClasses: readonly ToolConstructor[]) {
    this.container = container;
    this.logger = logger;
    this.toolClasses = toolClasses;
    // Не инициализируем tools сразу — делаем это lazy
  }

  /**
   * Lazy initialization всех tools из DI контейнера
   */
  private ensureInitialized(): void {
    if (this.tools !== null) {
      return; // Уже инициализировано
    }

    this.tools = new Map();

    // АВТОМАТИЧЕСКАЯ регистрация всех tools из DI контейнера
    for (const ToolClass of this.toolClasses) {
      const symbol = Symbol.for(ToolClass.name);
      const tool = this.container.get<BaseTool>(symbol);
      this.registerTool(tool);
    }

    this.logger.debug(`Зарегистрировано инструментов: ${this.tools.size}`);
  }

  /**
   * Регистрация нового инструмента
   */
  private registerTool(tool: BaseTool): void {
    // tools всегда не null здесь, т.к. вызывается только из ensureInitialized
    if (this.tools) {
      this.tools.set(tool.getDefinition().name, tool);
      this.logger.debug(`Зарегистрирован инструмент: ${tool.getDefinition().name}`);
    }
  }

  /**
   * Добавить дополнительный инструмент из контейнера
   *
   * Используется для регистрации инструментов с нестандартными зависимостями
   * (например, SearchToolsTool с зависимостью от SearchEngine)
   *
   * @param symbolKey - Строковый ключ для Symbol.for() или Symbol
   */
  public registerToolFromContainer(symbolKey: string | symbol): void {
    // ВАЖНО: Сначала инициализируем все стандартные tools
    // Иначе создание this.tools здесь заблокирует ensureInitialized()
    this.ensureInitialized();

    const symbol = typeof symbolKey === 'string' ? Symbol.for(symbolKey) : symbolKey;
    const tool = this.container.get<BaseTool>(symbol);

    this.registerTool(tool);
  }

  /**
   * Сортировка инструментов по приоритету
   *
   * Порядок: critical → high → normal → low → алфавит (внутри priority)
   *
   * @param tools - Массив инструментов
   * @returns Отсортированный массив
   */
  private sortByPriority(tools: BaseTool[]): BaseTool[] {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    return tools.sort((a, b) => {
      // Получаем priority из METADATA
      const aClass = a.constructor as typeof BaseTool;
      const bClass = b.constructor as typeof BaseTool;
      const aPriority = aClass.METADATA?.priority || 'normal';
      const bPriority = bClass.METADATA?.priority || 'normal';

      const aPrio = priorityOrder[aPriority] ?? 2; // default: normal
      const bPrio = priorityOrder[bPriority] ?? 2; // default: normal

      // Сначала по priority
      if (aPrio !== bPrio) {
        return aPrio - bPrio;
      }

      // Затем по имени (алфавит)
      return a.getDefinition().name.localeCompare(b.getDefinition().name);
    });
  }

  /**
   * Получить определения всех зарегистрированных инструментов
   *
   * Инструменты отсортированы по приоритету: critical → high → normal → low
   */
  getDefinitions(): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }

    const tools = Array.from(this.tools.values());
    const sorted = this.sortByPriority(tools);

    // Логируем распределение по приоритетам
    this.logger.debug('Tools sorted by priority', {
      critical: sorted.filter((t) => {
        const tClass = t.constructor as typeof BaseTool;
        return tClass.METADATA?.priority === 'critical';
      }).length,
      high: sorted.filter((t) => {
        const tClass = t.constructor as typeof BaseTool;
        return tClass.METADATA?.priority === 'high';
      }).length,
      normal: sorted.filter((t) => {
        const tClass = t.constructor as typeof BaseTool;
        const priority = tClass.METADATA?.priority || 'normal';
        return priority === 'normal';
      }).length,
      low: sorted.filter((t) => {
        const tClass = t.constructor as typeof BaseTool;
        return tClass.METADATA?.priority === 'low';
      }).length,
    });

    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Получить tool по имени
   */
  getTool(name: string): BaseTool | undefined {
    this.ensureInitialized();
    return this.tools?.get(name);
  }

  /**
   * Получить все зарегистрированные tools
   */
  getAllTools(): BaseTool[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }
    return Array.from(this.tools.values());
  }

  /**
   * Получить essential инструменты (для lazy discovery)
   *
   * Инструменты отсортированы по приоритету: critical → high → normal → low
   *
   * @param essentialNames - список имен essential инструментов
   * @returns Определения только essential инструментов
   */
  getEssentialDefinitions(essentialNames: readonly string[]): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }

    const essentialSet = new Set(essentialNames);
    const tools = Array.from(this.tools.values()).filter((tool) =>
      essentialSet.has(tool.getDefinition().name)
    );

    const sorted = this.sortByPriority(tools);
    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Получить инструменты, отфильтрованные по категориям
   *
   * @param filter - Фильтр категорий из конфигурации
   * @returns Определения инструментов, соответствующих фильтру
   */
  getDefinitionsByCategories(filter: ParsedCategoryFilter): ToolDefinition[] {
    this.ensureInitialized();

    if (!this.tools) {
      return [];
    }

    // Если includeAll = true, возвращаем все инструменты
    if (filter.includeAll) {
      return this.getDefinitions();
    }

    // Собираем известные категории и подкатегории для валидации
    const knownCategories = new Set<string>();
    const knownSubcategories = new Map<string, Set<string>>();

    for (const tool of this.tools.values()) {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

      if (metadata?.category) {
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

    const tools = Array.from(this.tools.values()).filter((tool) => {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

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

    const sorted = this.sortByPriority(tools);

    // Логирование фильтрации
    this.logger.info('Tools filtered by categories', {
      totalTools: this.tools.size,
      filteredTools: sorted.length,
      categories: Array.from(filter.categories),
      categoriesWithSubcategories: Array.from(filter.categoriesWithSubcategories.entries()).map(
        ([cat, subcats]) => ({ category: cat, subcategories: Array.from(subcats) })
      ),
    });

    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Применить негативный фильтр (исключение отключенных групп)
   *
   * @param tools - Список инструментов
   * @param disabledFilter - Фильтр отключенных категорий/подкатегорий
   * @returns Отфильтрованный список инструментов
   */
  private applyDisabledFilter(
    tools: BaseTool[],
    disabledFilter: ParsedCategoryFilter
  ): BaseTool[] {
    return tools.filter((tool) => {
      const toolClass = tool.constructor as typeof BaseTool;
      const metadata = toolClass.METADATA;

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
  }

  /**
   * Получить определения в зависимости от режима discovery
   *
   * @param mode - режим обнаружения ('lazy' или 'eager')
   * @param essentialNames - список essential инструментов (для lazy режима)
   * @param categoryFilter - фильтр категорий (для eager режима с фильтрацией)
   * @param disabledFilter - негативный фильтр (отключенные группы, приоритет над categoryFilter)
   * @returns Определения инструментов
   */
  getDefinitionsByMode(
    mode: 'lazy' | 'eager',
    essentialNames?: readonly string[],
    categoryFilter?: ParsedCategoryFilter,
    disabledFilter?: ParsedCategoryFilter
  ): ToolDefinition[] {
    if (mode === 'lazy') {
      // Lazy mode: только essential tools
      const names = essentialNames ?? ['ping', 'search_tools'];
      return this.getEssentialDefinitions(names);
    }

    // Eager mode
    let tools: BaseTool[];

    // Шаг 1: позитивный фильтр (если указан)
    if (categoryFilter && !categoryFilter.includeAll) {
      this.ensureInitialized();
      if (!this.tools) {
        return [];
      }

      tools = Array.from(this.tools.values()).filter((tool) => {
        const toolClass = tool.constructor as typeof BaseTool;
        const metadata = toolClass.METADATA;

        if (!metadata?.category) {
          return true; // Инструменты без категории всегда включены
        }

        const category = metadata.category;
        const subcategory = metadata.subcategory;

        // Проверка категории без подкатегории
        if (categoryFilter.categories.has(category)) {
          return true;
        }

        // Проверка категории с конкретными подкатегориями
        if (subcategory && categoryFilter.categoriesWithSubcategories.has(category)) {
          const allowedSubcategories = categoryFilter.categoriesWithSubcategories.get(category);
          if (allowedSubcategories) {
            return allowedSubcategories.has(subcategory);
          }
        }

        return false;
      });
    } else {
      // Все инструменты
      this.ensureInitialized();
      if (!this.tools) {
        return [];
      }
      tools = Array.from(this.tools.values());
    }

    // Шаг 2: негативный фильтр (если указан, имеет приоритет)
    if (disabledFilter) {
      tools = this.applyDisabledFilter(tools, disabledFilter);

      // Логирование отключенных групп
      this.logger.info('✂️  Применён фильтр отключенных групп', {
        disabledCategories: Array.from(disabledFilter.categories),
        disabledCategoriesWithSubcategories: Array.from(
          disabledFilter.categoriesWithSubcategories.entries()
        ).map(([cat, subcats]) => ({
          category: cat,
          subcategories: Array.from(subcats),
        })),
        totalToolsAfterFilter: tools.length,
      });
    }

    // Сортировка по приоритету
    const sorted = this.sortByPriority(tools);
    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Выполнить инструмент по имени
   */
  async execute(name: string, params: ToolCallParams): Promise<ToolResult> {
    this.ensureInitialized();

    this.logger.info(`🔍 Поиск инструмента: ${name}`);
    this.logger.debug('Параметры вызова:', params);

    const tool = this.tools?.get(name);

    if (!tool) {
      const allTools = Array.from(this.tools?.keys() || []);

      // Fuzzy поиск похожих имен
      const similarTools = allTools.filter((t) => t.includes(name) || name.includes(t));

      this.logger.error(`❌ Инструмент "${name}" не найден`, {
        requestedTool: name,
        availableTools: allTools,
        totalAvailable: allTools.length,
        similarTools,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: `Инструмент "${name}" не найден`,
                availableTools: allTools,
                hint:
                  similarTools.length > 0
                    ? `Возможно вы имели в виду: ${similarTools.join(', ')}`
                    : 'Используйте search_tools для поиска доступных инструментов',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    this.logger.debug(`✅ Инструмент найден, выполняем...`, {
      toolName: name,
    });

    try {
      const result = await tool.execute(params);
      this.logger.info(`✅ Инструмент ${name} выполнен успешно`);
      return result;
    } catch (error) {
      this.logger.error(`Ошибка при выполнении инструмента ${name}:`, error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: error instanceof Error ? error.message : 'Неизвестная ошибка',
                tool: name,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
