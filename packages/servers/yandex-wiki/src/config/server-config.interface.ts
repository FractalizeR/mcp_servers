/**
 * Server configuration types and interfaces for Yandex Wiki
 */

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
  /** Директория для лог-файлов */
  logsDir: string;
  /** Включить pretty-printing логов (для development) */
  prettyLogs: boolean;
  /** Максимальный размер лог-файла в байтах */
  logMaxSize: number;
  /** Количество ротируемых лог-файлов */
  logMaxFiles: number;
  /**
   * Режим обнаружения инструментов для MCP tools/list endpoint
   *
   * - 'lazy': tools/list возвращает только essential tools
   * - 'eager': tools/list возвращает все инструменты
   *
   * @default 'eager'
   */
  toolDiscoveryMode: 'lazy' | 'eager';
  /**
   * Список essential инструментов для lazy режима
   */
  essentialTools: readonly string[];
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
}

/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
