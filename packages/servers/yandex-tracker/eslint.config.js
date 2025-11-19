import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.vitest/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,

      // Метрики сложности (warnings для существующего кода)
      complexity: ['warn', 25],
      'max-depth': ['warn', 5],
      'max-lines': ['warn', 500],
      'max-lines-per-function': ['warn', 100],
      'max-params': ['warn', 5],

      // SonarJS rules (warnings)
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/todo-tag': 'off',
      'sonarjs/os-command': 'off',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/deprecation': 'off',
      'sonarjs/no-identical-functions': 'off',
      'sonarjs/no-control-regex': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',

      // TypeScript правила
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Общие правила
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        EXPERIMENTAL_useProjectService: false,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
    },
    rules: {
      // Базовые TypeScript правила (без type-aware)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Метрики сложности (warnings для скриптов)
      complexity: ['warn', 25],
      'max-depth': ['warn', 5],
      'max-lines': ['warn', 500],
      'max-lines-per-function': ['warn', 100],
      'max-params': ['warn', 5],

      // SonarJS rules (warnings)
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/todo-tag': 'off',
      'sonarjs/os-command': 'off',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/deprecation': 'off',
      'sonarjs/no-identical-functions': 'off',
      'sonarjs/no-control-regex': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',

      // Общие правила
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  prettierConfig,
];
