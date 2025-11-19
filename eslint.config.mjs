import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

/**
 * ESLint Flat Config для Monorepo (2025 Best Practices)
 *
 * Ключевые улучшения:
 * - ✅ Использование projectService вместо project (TypeScript ESLint v8)
 * - ✅ Использование globals пакета вместо ручного определения
 * - ✅ Устранение дублирования конфигурации
 * - ✅ Правильная структура ignores (global ignores первыми)
 * - ✅ Отдельные overrides для тестов и config файлов
 *
 * @see https://eslint.org/docs/latest/use/configure/
 * @see https://typescript-eslint.io/packages/parser#projectservice
 */
export default [
  // 1. GLOBAL IGNORES (должны быть первыми!)
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/.husky/_/**',
      '**/jscpd-report/**',
      '**/.agentic-planning/**',
      '**/.mcpb-build/**',
      '**/manifest.json',
      '**/*.mcpb',
    ],
  },

  // 2. BASE CONFIG для всех TS файлов
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true, // ← NEW! TypeScript ESLint v8 (авто-обнаружение tsconfig)
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      sonarjs: sonarjs,
    },
    rules: {
      // Recommended configs
      ...eslint.configs.recommended.rules,
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['recommended-type-checked'].rules,

      // TypeScript specific
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/only-throw-error': 'off',

      // Complexity metrics
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 4],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', 20],

      // SonarJS
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',

      // General
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // 3. OVERRIDE для тестов
  {
    files: ['**/tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
    },
  },

  // 4. OVERRIDE для config файлов и скриптов
  {
    files: ['**/*.config.{ts,mjs,js}', '**/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // 5. PRETTIER (должен быть последним!)
  prettierConfig,
];
