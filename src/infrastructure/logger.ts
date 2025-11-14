/**
 * Модуль логирования с поддержкой уровней
 */

import type { LogLevel } from '@types';

/**
 * Порядок уровней логирования (от самого детального до критичного)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Класс для логирования с настраиваемым уровнем
 */
export class Logger {
  private currentLevel: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.currentLevel = level;
  }

  /**
   * Установить уровень логирования
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Проверка, нужно ли логировать сообщение данного уровня
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  /**
   * Форматирование сообщения с временной меткой
   */
  private format(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const argsStr = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return `[${timestamp}] ${levelStr} ${message}${argsStr}`;
  }

  /**
   * Debug логирование
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.error(this.format('debug', message, ...args));
    }
  }

  /**
   * Info логирование
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.error(this.format('info', message, ...args));
    }
  }

  /**
   * Warning логирование
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.error(this.format('warn', message, ...args));
    }
  }

  /**
   * Error логирование
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, ...args));
    }
  }
}
