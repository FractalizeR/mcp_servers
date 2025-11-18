/**
 * Template-based генератор фикстур для интеграционных тестов
 *
 * Использует JSON-шаблоны из реального API и автоматически рандомизирует данные
 * по умным правилам определения типа поля.
 *
 * Преимущества:
 * - Масштабируется: добавил шаблон → получил генератор
 * - Актуальность: шаблоны из реального API
 * - Безопасность: автоматическая замена чувствительных данных
 * - Гибкость: кастомизация через overrides
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Правила рандомизации для разных типов полей
 */
interface RandomizationRule {
  /** Проверка применимости правила к полю */
  matches: (key: string, value: unknown) => boolean;
  /** Функция генерации нового значения */
  generate: (value: unknown, key: string) => unknown;
}

/**
 * Вспомогательные функции для генерации рандомных данных
 */
class RandomGenerators {
  static string(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  static int(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static pastDate(maxDaysAgo = 365): string {
    const now = Date.now();
    const daysAgo = this.int(1, maxDaysAgo);
    return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  }

  static futureDate(maxDaysAhead = 365): string {
    const now = Date.now();
    const daysAhead = this.int(1, maxDaysAhead);
    return new Date(now + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  }

  static cloudUid(): string {
    return `${this.string(4)}${this.string(16)}`;
  }

  static passportUid(): number {
    return this.int(1000000000, 9999999999);
  }

  static objectId(): string {
    return this.string(24); // MongoDB-style ObjectId
  }

  static queueKey(): string {
    return `TESTQ${this.int(1, 999)}`;
  }

  static issueId(): number {
    return this.int(1, 9999);
  }

  static displayName(): string {
    const firstNames = ['Иван', 'Мария', 'Алексей', 'Екатерина', 'Дмитрий', 'Анна'];
    const lastNames = ['Иванов', 'Петров', 'Сидоров', 'Смирнова', 'Козлова', 'Попова'];
    return `${firstNames[this.int(0, firstNames.length - 1)]} ${lastNames[this.int(0, lastNames.length - 1)]}`;
  }

  static email(): string {
    return `test.user${this.int(1, 999)}@example.com`;
  }

  static login(): string {
    return `testuser${this.int(1, 999)}`;
  }

  static summary(): string {
    return `Тестовая задача ${this.string(8)}`;
  }
}

/**
 * Предустановленные правила рандомизации
 */
const DEFAULT_RULES: RandomizationRule[] = [
  // URL с параметрами (например, self)
  {
    matches: (_key, value) =>
      typeof value === 'string' && value.startsWith('https://api.tracker.yandex.net/'),
    generate: (value) => {
      const url = value as string;
      // Заменяем ID в URL на рандомные
      return url
        .replace(/\/users\/\d+/, `/users/${RandomGenerators.passportUid()}`)
        .replace(/\/users\/[a-z0-9]+/, `/users/${RandomGenerators.objectId()}`)
        .replace(/\/queues\/[A-Z0-9]+/, `/queues/${RandomGenerators.queueKey()}`)
        .replace(/\/issues\/[A-Z]+-\d+/, `/issues/TEST-${RandomGenerators.issueId()}`)
        .replace(/\/\d{24}([/?]|$)/, `/${RandomGenerators.objectId()}$1`);
    },
  },

  // MongoDB ObjectId (24 символа hex)
  {
    matches: (key, value) =>
      (key === 'id' || key.endsWith('Id')) &&
      typeof value === 'string' &&
      /^[a-f0-9]{24}$/.test(value),
    generate: () => RandomGenerators.objectId(),
  },

  // Passport UID (большое число)
  {
    matches: (key, value) =>
      (key === 'passportUid' || key === 'uid' || key === 'trackerUid') &&
      typeof value === 'number' &&
      value > 1000000000,
    generate: () => RandomGenerators.passportUid(),
  },

  // Cloud UID (строка формата ajemXXXX...)
  {
    matches: (key, value) =>
      key === 'cloudUid' && typeof value === 'string' && /^[a-z]{4}[a-z0-9]{16,}$/.test(value),
    generate: () => RandomGenerators.cloudUid(),
  },

  // Email
  {
    matches: (key, value) => key === 'email' && typeof value === 'string' && value.includes('@'),
    generate: () => RandomGenerators.email(),
  },

  // Login
  {
    matches: (key, value) => key === 'login' && typeof value === 'string',
    generate: () => RandomGenerators.login(),
  },

  // Display name
  {
    matches: (key, value) =>
      (key === 'display' || key === 'displayName') &&
      typeof value === 'string' &&
      value.split(' ').length >= 2,
    generate: () => RandomGenerators.displayName(),
  },

  // First/Last name
  {
    matches: (key, value) =>
      (key === 'firstName' || key === 'lastName') && typeof value === 'string',
    generate: (_value, key) =>
      key === 'firstName' ? 'Тестовый' : `Пользователь${RandomGenerators.int(1, 999)}`,
  },

  // ISO Dates
  {
    matches: (key, value) =>
      (key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('at') ||
        key.toLowerCase().includes('time')) &&
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(value),
    generate: (value) => {
      // Preserve future dates
      const isFuture = new Date(value as string) > new Date();
      return isFuture ? RandomGenerators.futureDate() : RandomGenerators.pastDate();
    },
  },

  // Summary/description
  {
    matches: (key, value) =>
      (key === 'summary' || key === 'description') && typeof value === 'string',
    generate: () => RandomGenerators.summary(),
  },

  // Issue key (QUEUE-123)
  {
    matches: (key, value) =>
      key === 'key' && typeof value === 'string' && /^[A-Z]+-\d+$/.test(value),
    generate: () => `TEST-${RandomGenerators.issueId()}`,
  },

  // Queue key
  {
    matches: (key, value) => key === 'key' && typeof value === 'string' && /^[A-Z]+$/.test(value),
    generate: () => RandomGenerators.queueKey(),
  },

  // Version numbers
  {
    matches: (key, value) => key === 'version' && typeof value === 'number',
    generate: () => RandomGenerators.int(1, 50),
  },

  // Counters
  {
    matches: (key, value) =>
      (key.toLowerCase().includes('count') || key === 'votes') && typeof value === 'number',
    generate: () => RandomGenerators.int(0, 10),
  },

  // Boolean flags
  {
    matches: (_key, value) => typeof value === 'boolean',
    generate: () => Math.random() > 0.5,
  },

  // Board/entity IDs (small numbers)
  {
    matches: (key, value) => key === 'id' && typeof value === 'number' && value < 10000,
    generate: () => RandomGenerators.int(1, 999),
  },

  // Board IDs in string format
  {
    matches: (key, value) => key === 'id' && typeof value === 'string' && /^\d{1,4}$/.test(value),
    generate: () => String(RandomGenerators.int(1, 999)),
  },
];

/**
 * Опции для генерации фикстур
 */
export interface GenerateOptions {
  /** Переопределения конкретных полей (deep merge) */
  overrides?: Record<string, unknown>;
  /** Дополнительные правила рандомизации */
  customRules?: RandomizationRule[];
  /** Отключить рандомизацию для определенных путей (dot notation) */
  preservePaths?: string[];
}

/**
 * Template-based генератор фикстур
 */
export class TemplateBasedGenerator {
  private rules: RandomizationRule[];

  constructor(customRules: RandomizationRule[] = []) {
    this.rules = [...DEFAULT_RULES, ...customRules];
  }

  /**
   * Загружает шаблон из файла
   */
  loadTemplate(templatePath: string): Record<string, unknown> {
    const content = readFileSync(templatePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  }

  /**
   * Генерирует фикстуру из шаблона
   */
  generate(
    template: Record<string, unknown>,
    options: GenerateOptions = {}
  ): Record<string, unknown> {
    const { overrides = {}, customRules = [], preservePaths = [] } = options;

    // Применяем кастомные правила
    const allRules = [...this.rules, ...customRules];

    // Рандомизируем шаблон
    const randomized = this.randomizeObject(template, allRules, preservePaths);

    // Применяем overrides (deep merge)
    return this.deepMerge(randomized, overrides);
  }

  /**
   * Рекурсивная рандомизация объекта
   */
  private randomizeObject(
    obj: Record<string, unknown>,
    rules: RandomizationRule[],
    preservePaths: string[],
    currentPath = ''
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const path = currentPath ? `${currentPath}.${key}` : key;

      // Пропускаем preserve paths
      if (preservePaths.includes(path)) {
        result[key] = value;
        continue;
      }

      // Рекурсия для объектов
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.randomizeObject(
          value as Record<string, unknown>,
          rules,
          preservePaths,
          path
        );
        continue;
      }

      // Рекурсия для массивов
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? this.randomizeObject(item as Record<string, unknown>, rules, preservePaths, path)
            : item
        );
        continue;
      }

      // Применяем правила рандомизации
      const matchingRule = rules.find((rule) => rule.matches(key, value));
      result[key] = matchingRule ? matchingRule.generate(value, key) : value;
    }

    return result;
  }

  /**
   * Deep merge двух объектов
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(
          (result[key] as Record<string, unknown>) || {},
          value as Record<string, unknown>
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

/**
 * Фабрика для создания генераторов из шаблонов
 */
export class TemplateGeneratorFactory {
  private templatesDir: string;
  private generator: TemplateBasedGenerator;

  constructor(templatesDir: string, customRules: RandomizationRule[] = []) {
    this.templatesDir = templatesDir;
    this.generator = new TemplateBasedGenerator(customRules);
  }

  /**
   * Создает генератор для конкретного шаблона
   */
  create(templateName: string) {
    const templatePath = join(this.templatesDir, `${templateName}.json`);
    const template = this.generator.loadTemplate(templatePath);

    return (options: GenerateOptions = {}) => this.generator.generate(template, options);
  }
}

/**
 * Глобальный инстанс фабрики для интеграционных тестов
 */
export const testFixtureFactory = new TemplateGeneratorFactory(join(__dirname, '../templates'));

/**
 * Удобные хелперы для генерации распространенных фикстур
 */
export const generateIssue = testFixtureFactory.create('issue');
export const generateUser = testFixtureFactory.create('user');
export const generateComment = testFixtureFactory.create('comment');

/**
 * Генераторы типичных ошибок API
 */
export function generateError404(): Record<string, unknown> {
  return {
    statusCode: 404,
    errorMessages: ['Issue not found'],
    errors: {},
  };
}

export function generateError401(): Record<string, unknown> {
  return {
    statusCode: 401,
    errorMessages: ['Authentication required'],
    errors: {},
  };
}

export function generateError403(): Record<string, unknown> {
  return {
    statusCode: 403,
    errorMessages: ['Access denied'],
    errors: {},
  };
}
