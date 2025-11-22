/**
 * Server configuration types and interfaces
 *
 * Moved from @mcp-framework/infrastructure to maintain clean separation:
 * Infrastructure layer should not contain domain-specific code (Yandex Tracker)
 */

/**
 * Распарсенная структура фильтра категорий инструментов
 *
 * Используется для фильтрации tools в tools/list endpoint.
 *
 * Примеры использования:
 * - includeAll=true: все категории
 * - categories=['issues', 'comments']: только issues и comments (все подкатегории)
 * - categoriesWithSubcategories={'issues': ['read', 'write']}: только issues/read и issues/write
 */
export interface ParsedCategoryFilter {
  /** Категории без подкатегорий (все подкатегории включены) */
  categories: Set<string>;

  /** Категории с конкретными подкатегориями */
  categoriesWithSubcategories: Map<string, Set<string>>;

  /** Включить все категории (пустой фильтр) */
  includeAll: boolean;
}

/**
 * Конфигурация сервера из переменных окружения
 */
export interface ServerConfig {
  /** OAuth токен для API Яндекс.Трекера */
  token: string;
  /** ID организации (Яндекс 360 для бизнеса) */
  orgId?: string;
  /** ID организации (Yandex Cloud Organization) */
  cloudOrgId?: string;
  /** Базовый URL API */
  apiBase: string;
  /** Уровень логирования */
  logLevel: LogLevel;
  /** Таймаут запросов в миллисекундах */
  requestTimeout: number;
  /** Максимальное количество элементов в одном batch-запросе (бизнес-лимит) */
  maxBatchSize: number;
  /** Максимальное количество одновременных HTTP-запросов (технический лимит, throttling) */
  maxConcurrentRequests: number;
  /** Директория для лог-файлов */
  logsDir: string;
  /** Включить pretty-printing логов (для development) */
  prettyLogs: boolean;
  /** Максимальный размер лог-файла в байтах (по умолчанию: 50KB) */
  logMaxSize: number;
  /** Количество ротируемых лог-файлов (по умолчанию: 20) */
  logMaxFiles: number;
  /**
   * Режим обнаружения инструментов для MCP tools/list endpoint
   *
   * - 'lazy': tools/list возвращает только essential tools (ping, search_tools)
   *   Claude должен использовать search_tools для обнаружения остальных инструментов
   *   Рекомендуется для 30+ инструментов (экономия контекста, масштабируемость)
   *
   * - 'eager': tools/list возвращает все инструменты (стандартное MCP поведение)
   *   Рекомендуется для <20 инструментов или отладки
   *
   * @default 'lazy'
   */
  toolDiscoveryMode: 'lazy' | 'eager';
  /**
   * Список essential инструментов для lazy режима
   *
   * Эти инструменты ВСЕГДА возвращаются в tools/list независимо от режима.
   *
   * По умолчанию: ['ping', 'search_tools']
   *
   * Используй для:
   * - Базовых инструментов (ping, health check)
   * - Discovery инструментов (search_tools)
   * - Критически важных операций, которые Claude должен видеть сразу
   */
  essentialTools: readonly string[];
  /**
   * Фильтр категорий инструментов для eager режима (позитивный фильтр)
   *
   * Позволяет включить только определенные категории/подкатегории инструментов.
   *
   * Формат переменной окружения ENABLED_TOOL_CATEGORIES:
   * - Пустая строка или undefined: все категории (по умолчанию)
   * - "issues,comments": только категории issues и comments (все подкатегории)
   * - "issues:read,comments:write": только issues/read и comments/write подкатегории
   * - "issues,comments:write,queues:read": смешанный формат
   *
   * Graceful degradation:
   * - Неизвестные категории: warning в лог, пропускаются
   * - Неверный формат: warning, используется includeAll=true
   *
   * Работает только в eager режиме. В lazy режиме используется essentialTools.
   *
   * @deprecated Используйте disabledToolGroups вместо этого (более интуитивный негативный фильтр)
   * @default undefined (все категории)
   */
  enabledToolCategories?: ParsedCategoryFilter;
  /**
   * Отключенные группы инструментов (негативный фильтр)
   *
   * Позволяет отключить определенные категории/подкатегории инструментов.
   *
   * Формат переменной окружения DISABLED_TOOL_GROUPS:
   * - Пустая строка или undefined: все инструменты включены (по умолчанию)
   * - "components,checklists": отключить целые категории components и checklists
   * - "issues:worklog,issues:attachments": отключить подкатегории worklog и attachments в issues
   * - "components,issues:worklog,helpers:demo": смешанный формат
   *
   * Graceful degradation:
   * - Неизвестные категории: warning в лог, пропускаются
   * - Неверный формат: warning, игнорируется
   *
   * Работает в обоих режимах (lazy и eager).
   * Имеет приоритет над enabledToolCategories если указаны оба.
   *
   * @default undefined (все инструменты включены)
   */
  disabledToolGroups?: ParsedCategoryFilter;
  /**
   * Максимальное количество повторных попыток HTTP запроса при ошибках
   *
   * Используется для автоматического повтора запросов при:
   * - Временных сетевых ошибках
   * - 429 (Too Many Requests)
   * - 503 (Service Unavailable)
   *
   * @default 3
   * @min 0
   * @max 10
   */
  retryAttempts?: number;
  /**
   * Минимальная задержка между повторными попытками в миллисекундах
   *
   * Используется в exponential backoff стратегии как начальное значение.
   * Каждая следующая попытка будет увеличивать задержку.
   *
   * @default 1000 (1 секунда)
   * @min 100
   * @max 5000
   */
  retryMinDelay?: number;
  /**
   * Максимальная задержка между повторными попытками в миллисекундах
   *
   * Используется в exponential backoff стратегии как верхняя граница.
   * Задержка никогда не превысит это значение.
   *
   * @default 10000 (10 секунд)
   * @min 1000
   * @max 60000
   */
  retryMaxDelay?: number;
}

/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
