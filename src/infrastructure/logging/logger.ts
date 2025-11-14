/**
 * Production-ready логирование с Pino
 *
 * Особенности:
 * - Structured logging (JSON)
 * - Dual output: stderr + файлы с ротацией
 * - Request tracing (correlation ID)
 * - Готовность к интеграции с alerting
 */

import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import { createStream } from 'rotating-file-stream';
import type { LogLevel } from '@types';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Конфигурация логгера
 */
export interface LoggerConfig {
  /** Уровень логирования */
  level: LogLevel;
  /** Директория для лог-файлов */
  logsDir?: string;
  /** Включить pretty-printing (для development) */
  pretty?: boolean;
  /** Включить ротацию логов */
  rotation?: {
    /** Максимальный размер файла (в байтах, по умолчанию 50KB) */
    maxSize?: number;
    /** Количество файлов для хранения (по умолчанию 20) */
    maxFiles?: number;
  };
}

/**
 * Интерфейс для alerting транспорта (задел на будущее)
 */
export interface AlertingTransport {
  /**
   * Отправить алерт
   */
  sendAlert(
    level: 'error' | 'warn',
    message: string,
    context: Record<string, unknown>
  ): Promise<void>;
}

/**
 * Wrapper над Pino с расширенной функциональностью
 */
export class Logger {
  private pino: PinoLogger;
  private alerting?: AlertingTransport;

  constructor(config: LoggerConfig) {
    this.pino = this.createPinoLogger(config);
  }

  /**
   * Создать Pino logger с правильной конфигурацией
   */
  private createPinoLogger(config: LoggerConfig): PinoLogger {
    // Для silent используем 'fatal' (самый высокий уровень) чтобы ничего не логировалось
    const pinoLevel = config.level === 'silent' ? 'fatal' : config.level;

    const pinoConfig: pino.LoggerOptions = {
      level: pinoLevel,
      // Форматирование для structured logging
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Базовые поля в каждом логе
      base: {
        pid: process.pid,
        hostname: undefined, // Убираем hostname для уменьшения размера
      },
      // Временные метки
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    };

    // Development mode: pretty printing в stderr
    if (config.pretty) {
      const prettyTransport = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }) as pino.DestinationStream;

      return pino(pinoConfig, prettyTransport);
    }

    // Production mode: dual logging (stderr + файлы с ротацией)
    if (config.logsDir) {
      // Создаём директорию для логов если её нет
      const logsPath = resolve(config.logsDir);
      try {
        mkdirSync(logsPath, { recursive: true });
      } catch (err) {
        // Игнорируем ошибку если папка уже существует
        if ((err as Error & { code?: string }).code !== 'EEXIST') {
          throw err;
        }
      }

      // Параметры ротации (по умолчанию: 50KB, 20 файлов)
      const maxSize = config.rotation?.maxSize || 50 * 1024; // 50KB
      const maxFiles = config.rotation?.maxFiles || 20;

      // Конвертация размера в формат rotating-file-stream (строка с суффиксом)
      const formatSize = (
        bytes: number
      ): `${number}B` | `${number}K` | `${number}M` | `${number}G` => {
        if (bytes >= 1024 * 1024) {
          return `${Math.floor(bytes / (1024 * 1024))}M`;
        }
        return `${Math.floor(bytes / 1024)}K`;
      };

      const sizeStr = formatSize(maxSize);

      const streams: pino.StreamEntry[] = [
        // Критичные логи (error/warn) → stderr для мониторинга
        {
          level: 'warn',
          stream: process.stderr,
        },
        // Все логи → файл с ротацией
        {
          level: pinoLevel,
          stream: createStream('combined.log', {
            path: logsPath,
            size: sizeStr,
            maxFiles,
            compress: 'gzip', // Сжатие старых логов
          }),
        },
        // Только ошибки → отдельный файл для быстрого поиска
        {
          level: 'error',
          stream: createStream('error.log', {
            path: logsPath,
            size: sizeStr,
            maxFiles,
            compress: 'gzip',
          }),
        },
      ];

      return pino(pinoConfig, pino.multistream(streams));
    }

    // Fallback: только stderr
    return pino(pinoConfig, process.stderr);
  }

  /**
   * Подключить alerting транспорт (для будущего использования)
   */
  setAlertingTransport(transport: AlertingTransport): void {
    this.alerting = transport;
  }

  /**
   * Создать child logger с дополнительным контекстом
   * Полезно для request tracing
   */
  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new Logger({ level: this.pino.level as LogLevel });
    childLogger.pino = this.pino.child(bindings);
    if (this.alerting) {
      childLogger.alerting = this.alerting;
    }
    return childLogger;
  }

  /**
   * Debug логирование
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pino.debug(context, message);
    } else {
      this.pino.debug(message);
    }
  }

  /**
   * Info логирование
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pino.info(context, message);
    } else {
      this.pino.info(message);
    }
  }

  /**
   * Warning логирование
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pino.warn(context, message);
    } else {
      this.pino.warn(message);
    }

    // Отправить алерт (если настроен)
    if (this.alerting && context) {
      void this.alerting.sendAlert('warn', message, context);
    }
  }

  /**
   * Error логирование
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : { error }),
    };

    this.pino.error(errorContext, message);

    // Отправить алерт (если настроен)
    if (this.alerting) {
      void this.alerting.sendAlert('error', message, errorContext);
    }
  }

  /**
   * Изменить уровень логирования
   */
  setLevel(level: LogLevel): void {
    this.pino.level = level;
  }

  /**
   * Получить текущий уровень
   */
  get level(): string {
    return this.pino.level;
  }

  /**
   * Flush всех буферов (для graceful shutdown)
   */
  async flush(): Promise<void> {
    // Pino автоматически флашит при завершении процесса
    // Но можно явно подождать
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
}
