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
      '@integration': resolve(__dirname, './tests/integration'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],

    // Параллелизация тестов
    pool: 'threads', // Использование worker threads для параллелизма
    maxWorkers: 8, // Максимальное количество worker threads
    maxConcurrency: 5, // Максимальное количество одновременно выполняемых тестов в одном worker
    fileParallelism: true, // Параллельное выполнение тестовых файлов
    isolate: true, // Изолировать каждый тестовый файл в отдельной среде

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
        // TODO: Повысить до 80% когда будет больше тестов
        // Цель: 80%, текущие требования соответствуют текущему покрытию
        branches: 59,
        functions: 70,
        lines: 61,
        statements: 61,
      },
    },
  },
});
