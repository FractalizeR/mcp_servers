/**
 * CLI логгер с цветным выводом
 */

/* eslint-disable no-console */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export class Logger {
  /**
   * Информационное сообщение
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Сообщение об успехе
   */
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Сообщение об ошибке
   */
  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Предупреждение
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Создать спиннер для долгих операций
   */
  static spinner(message: string): Ora {
    return ora(message).start();
  }

  /**
   * Пустая строка
   */
  static newLine(): void {
    console.log();
  }

  /**
   * Заголовок
   */
  static header(message: string): void {
    console.log();
    console.log(chalk.bold.cyan(message));
    console.log();
  }
}
