/**
 * Server configuration types and interfaces for Yandex Wiki
 */

/**
 * Распарсенная структура фильтра категорий инструментов
 *
 * Используется для фильтрации tools в tools/list endpoint.
 *
 * Примеры использования:
 * - includeAll=true: все категории
 * - categories=['pages', 'grids']: только pages и grids (все подкатегории)
 * - categoriesWithSubcategories={'pages': ['read', 'write']}: только pages/read и pages/write
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
  /** OAuth токен для API Yandex Wiki */
  token: string;
  /** ID организации (Яндекс 360 для бизнеса) */
  orgId?: string;
  /** ID организации (Yandex Cloud Organization) */
  cloudOrgId?: string;
  /** Базовый URL API (hardcoded) */
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
  /** Максимальный размер лог-файла в байтах */
  logMaxSize: number;
  /** Количество ротируемых лог-файлов */
  logMaxFiles: number;
  /**
   * Количество повторных попыток HTTP запроса
   * @default 3
   */
  retryAttempts: number;
  /**
   * Минимальная задержка между повторными попытками в мс
   * @default 1000
   */
  retryMinDelay: number;
  /**
   * Максимальная задержка между повторными попытками в мс
   * @default 10000
   */
  retryMaxDelay: number;
  /**
   * Отключенные группы инструментов (единственный рубильник видимости/исполняемости)
   *
   * Позволяет отключить определенные категории/подкатегории инструментов.
   * `tools/list` всегда отдаёт полный набор инструментов, прошедший этот фильтр —
   * progressive disclosure (essential tools, lazy discovery) убран.
   *
   * Формат переменной окружения DISABLED_TOOL_GROUPS:
   * - Пустая строка или undefined: все инструменты включены (по умолчанию)
   * - "grids,pages:write": отключить целую категорию grids и подкатегорию write в pages
   * - "pages:delete,grids:update": отключить подкатегории delete и update
   *
   * Graceful degradation:
   * - Неизвестные категории: warning в лог (stderr), пропускаются
   * - Неверный формат: warning, игнорируется
   *
   * Отключённая группа не только скрывается из tools/list, но и не вызывается —
   * см. `ConfiguredToolAccessPolicy`.
   *
   * @default undefined (все инструменты включены)
   */
  disabledToolGroups?: ParsedCategoryFilter;
}

/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
