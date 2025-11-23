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
      '**/.vitest/**',
    ],
  },
  {
    files: ['**/*.ts'],
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

      // Метрики сложности
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines': ['warn', 400],
      'max-lines-per-function': ['warn', 50],
      'max-params': ['warn', 4],

      // SonarJS rules
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/todo-tag': 'off',
      'sonarjs/os-command': 'off',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/deprecation': 'off',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-control-regex': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',

      // TypeScript правила (строже для framework пакетов)
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Общие правила
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  prettierConfig,
];
