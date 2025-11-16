import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@composition-root': resolve(__dirname, './src/composition-root'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@tracker_api': resolve(__dirname, './src/tracker_api'),
      '@mcp': resolve(__dirname, './src/mcp'),
      '@cli': resolve(__dirname, './src/cli'),
      '@types': resolve(__dirname, './src/types.ts'),
      '@constants': resolve(__dirname, './src/constants.ts'),
      '@integration': resolve(__dirname, './tests/integration'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],

    // Параллелизация тестов
    pool: 'threads', // Стандартные worker threads, совместимые с axios-моками
    maxWorkers: 8, // Максимальное количество worker threads
    maxConcurrency: 5, // Максимальное количество одновременно выполняемых тестов в одном worker
    fileParallelism: true, // Параллельное выполнение тестовых файлов
    isolate: true, // Изоляция файлов: моки axios настраиваются на каждый тест

    // Случайный порядок выполнения для обнаружения зависимостей между тестами
    sequence: {
      shuffle: true, // Тесты выполняются в случайном порядке каждый раз
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        // Обновлено 2025-11-16: установлено на 2-3% ниже текущих значений
        // для защиты от регрессии с запасом на изменения
        // Текущий coverage: statements 78%, branches 81%, functions 84%, lines 78%
        branches: 78,
        functions: 81,
        lines: 75,
        statements: 75,
      },
    },
  },
});
