/**
 * CLI логгер с цветным выводом
 *
 * @module Logger
 * @description Утилита для форматированного вывода сообщений в консоль с использованием chalk и ora
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Класс для вывода цветных сообщений в консоль
 *
 * @example
 * ```typescript
 * // Вывод информационного сообщения
 * Logger.info('Процесс запущен');
 *
 * // Вывод сообщения об успехе
 * Logger.success('Операция завершена');
 *
 * // Использование спиннера для долгих операций
 * const spinner = Logger.spinner('Загрузка...');
 * await longRunningOperation();
 * spinner.succeed('Загрузка завершена');
 * ```
 */
export class Logger {
  /**
   * Информационное сообщение (синий цвет)
   *
   * @param message - Текст сообщения
   *
   * @example
   * ```typescript
   * Logger.info('Начинаем обработку файлов');
   * ```
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Сообщение об успехе (зеленый цвет)
   *
   * @param message - Текст сообщения
   *
   * @example
   * ```typescript
   * Logger.success('Файл успешно сохранен');
   * ```
   */
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Сообщение об ошибке (красный цвет)
   *
   * @param message - Текст сообщения
   *
   * @example
   * ```typescript
   * Logger.error('Не удалось подключиться к серверу');
   * ```
   */
  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Предупреждение (желтый цвет)
   *
   * @param message - Текст сообщения
   *
   * @example
   * ```typescript
   * Logger.warn('Файл не найден, используем значения по умолчанию');
   * ```
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Создать спиннер для долгих операций
   *
   * @param message - Текст, отображаемый рядом со спиннером
   * @returns Экземпляр Ora спиннера
   *
   * @example
   * ```typescript
   * const spinner = Logger.spinner('Загрузка данных...');
   * try {
   *   await fetchData();
   *   spinner.succeed('Данные загружены');
   * } catch (error) {
   *   spinner.fail('Ошибка загрузки');
   * }
   * ```
   */
  static spinner(message: string): Ora {
    return ora(message).start();
  }

  /**
   * Вывести пустую строку
   *
   * @example
   * ```typescript
   * Logger.info('Первое сообщение');
   * Logger.newLine();
   * Logger.info('Второе сообщение');
   * ```
   */
  static newLine(): void {
    console.log();
  }

  /**
   * Вывести заголовок секции (жирный голубой текст)
   *
   * @param message - Текст заголовка
   *
   * @example
   * ```typescript
   * Logger.header('Конфигурация приложения');
   * Logger.info('API URL: https://api.example.com');
   * Logger.info('Timeout: 30s');
   * ```
   */
  static header(message: string): void {
    console.log();
    console.log(chalk.bold.cyan(message));
    console.log();
  }
}
