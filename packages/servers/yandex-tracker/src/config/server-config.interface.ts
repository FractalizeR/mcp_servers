/**
 * Server configuration types and interfaces
 *
 * Moved from @fractalizer/mcp-infrastructure to maintain clean separation:
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
   * Отключенные группы инструментов (единственный рубильник видимости/исполняемости)
   *
   * Позволяет отключить определенные категории/подкатегории инструментов.
   * `tools/list` всегда отдаёт полный набор инструментов, прошедший этот фильтр —
   * progressive disclosure (essential tools, lazy discovery) убран: основной
   * потребитель — готовые клиенты (Claude Code, Claude Desktop, Codex), где
   * поиск инструментов уже реализован на их стороне.
   *
   * Формат переменной окружения DISABLED_TOOL_GROUPS:
   * - Пустая строка или undefined: все инструменты включены (по умолчанию)
   * - "components,checklists": отключить целые категории components и checklists
   * - "issues:worklog,issues:attachments": отключить подкатегории worklog и attachments в issues
   * - "components,issues:worklog,helpers:demo": смешанный формат
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
