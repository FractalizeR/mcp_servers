/**
 * Базовые типы и интерфейсы для MCP коннекторов
 */

/**
 * Информация о MCP клиенте
 */
export interface MCPClientInfo {
  /** Уникальное имя клиента (используется как ключ в реестре) */
  name: string;

  /** Отображаемое имя для пользователя */
  displayName: string;

  /** Описание клиента */
  description: string;

  /** Команда для проверки установки (например, 'claude --version') */
  checkCommand?: string;

  /** Путь к конфигурационному файлу */
  configPath: string;

  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}

/**
 * Конфигурация MCP сервера
 */
export interface MCPServerConfig {
  /** OAuth токен Яндекс.Трекера */
  token: string;

  /** ID организации */
  orgId: string;

  /** Базовый URL API (опционально) */
  apiBase?: string;

  /** Уровень логирования */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Таймаут запросов */
  requestTimeout?: number;

  /** Абсолютный путь к проекту */
  projectPath: string;
}

/**
 * Статус подключения MCP сервера
 */
export interface ConnectionStatus {
  /** Подключен ли сервер */
  connected: boolean;

  /** Детали подключения (если подключен) */
  details?: {
    /** Путь к конфигу */
    configPath: string;

    /** Время последнего изменения конфига */
    lastModified?: Date;

    /** Дополнительная информация */
    metadata?: Record<string, unknown>;
  };

  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Базовый интерфейс для всех MCP коннекторов
 */
export interface MCPConnector {
  /** Получить информацию о клиенте */
  getClientInfo(): MCPClientInfo;

  /** Проверить, установлен ли клиент */
  isInstalled(): Promise<boolean>;

  /** Проверить текущий статус подключения */
  getStatus(): Promise<ConnectionStatus>;

  /** Подключить MCP сервер к клиенту */
  connect(config: MCPServerConfig): Promise<void>;

  /** Отключить MCP сервер от клиента */
  disconnect(): Promise<void>;

  /** Валидировать конфигурацию перед подключением */
  validateConfig(config: MCPServerConfig): Promise<string[]>;
}
