import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import prettierConfig from 'eslint-config-prettier';

/**
 * Shared ESLint Flat Config for Monorepo
 *
 * Два профиля:
 * - frameworkConfig() — строгий, для framework пакетов (infrastructure, core, search, cli)
 * - serverConfig() — чуть мягче, для серверов (yandex-tracker, ticktick, yandex-wiki)
 *
 * Использование в пакете:
 *   import { frameworkConfig } from '../../eslint.config.shared.js';
 *   export default frameworkConfig();
 */

const COMMON_IGNORES = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.vite/**',
    '**/.vitest/**',
  ],
};

const COMMON_SONARJS_RULES = {
  'sonarjs/todo-tag': 'off',
  'sonarjs/os-command': 'off',
  'sonarjs/no-identical-expressions': 'warn',
  'sonarjs/deprecation': 'off',
  'sonarjs/no-control-regex': 'warn',
  'sonarjs/no-nested-template-literals': 'warn',
};

const COMMON_GENERAL_RULES = {
  'prefer-const': 'error',
  'no-var': 'error',
};

const COMMON_UNUSED_VARS = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  },
];

function makeSrcConfig({ complexity, maxDepth, maxLines, maxLinesPerFunction, maxParams, cognitiveComplexity, explicitReturnType, explicitModuleBoundary, noNonNullAssertion, noIdenticalFunctions, noConsole }) {
  return {
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

      // Complexity metrics
      complexity: ['warn', complexity],
      'max-depth': ['warn', maxDepth],
      'max-lines': ['warn', maxLines],
      'max-lines-per-function': ['warn', maxLinesPerFunction],
      'max-params': ['warn', maxParams],

      // SonarJS
      'sonarjs/cognitive-complexity': ['warn', cognitiveComplexity],
      'sonarjs/no-identical-functions': noIdenticalFunctions,
      ...COMMON_SONARJS_RULES,

      // TypeScript
      '@typescript-eslint/explicit-function-return-type': explicitReturnType,
      '@typescript-eslint/explicit-module-boundary-types': explicitModuleBoundary,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': COMMON_UNUSED_VARS,
      '@typescript-eslint/no-non-null-assertion': noNonNullAssertion,

      // General
      'no-console': noConsole,
      ...COMMON_GENERAL_RULES,
    },
  };
}

function makeTestConfig({ complexity, maxDepth, maxLines, maxLinesPerFunction, maxParams, cognitiveComplexity, noIdenticalFunctions }) {
  return {
    files: ['tests/**/*.ts'],
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
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': COMMON_UNUSED_VARS,
      '@typescript-eslint/no-non-null-assertion': 'warn',

      complexity: ['warn', complexity],
      'max-depth': ['warn', maxDepth],
      'max-lines': ['warn', maxLines],
      'max-lines-per-function': ['warn', maxLinesPerFunction],
      'max-params': ['warn', maxParams],

      'sonarjs/cognitive-complexity': ['warn', cognitiveComplexity],
      'sonarjs/no-identical-functions': noIdenticalFunctions,
      ...COMMON_SONARJS_RULES,

      'no-console': 'off',
      ...COMMON_GENERAL_RULES,
    },
  };
}

/**
 * Framework config — строгий профиль для infrastructure, core, search, cli
 */
export function frameworkConfig() {
  return [
    COMMON_IGNORES,
    makeSrcConfig({
      complexity: 10,
      maxDepth: 4,
      maxLines: 400,
      maxLinesPerFunction: 50,
      maxParams: 4,
      cognitiveComplexity: 15,
      explicitReturnType: 'error',
      explicitModuleBoundary: 'error',
      noNonNullAssertion: 'error',
      noIdenticalFunctions: 'warn',
      noConsole: ['warn', { allow: ['error', 'warn'] }],
    }),
    makeTestConfig({
      complexity: 20,
      maxDepth: 5,
      maxLines: 500,
      maxLinesPerFunction: 100,
      maxParams: 5,
      cognitiveComplexity: 20,
      noIdenticalFunctions: 'off',
    }),
    prettierConfig,
  ];
}

/**
 * Server config — чуть мягче для серверов (yandex-tracker, ticktick, yandex-wiki)
 */
export function serverConfig() {
  return [
    { ignores: [...COMMON_IGNORES.ignores, 'scripts/**'] },
    makeSrcConfig({
      complexity: 15,
      maxDepth: 5,
      maxLines: 400,
      maxLinesPerFunction: 75,
      maxParams: 5,
      cognitiveComplexity: 15,
      explicitReturnType: 'warn',
      explicitModuleBoundary: 'off',
      noNonNullAssertion: 'warn',
      noIdenticalFunctions: 'warn',
      noConsole: 'off',
    }),
    makeTestConfig({
      complexity: 25,
      maxDepth: 6,
      maxLines: 600,
      maxLinesPerFunction: 150,
      maxParams: 6,
      cognitiveComplexity: 20,
      noIdenticalFunctions: 'off',
    }),
    prettierConfig,
  ];
}
