import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import prettierConfig from 'eslint-config-prettier';

/**
 * Shared ESLint Flat Config for Monorepo
 *
 * Два профиля:
 * - frameworkConfig() — строгий, для framework пакетов (infrastructure, core, search, cli)
 * - serverConfig() — чуть мягче, для серверов (yandex-tracker, yandex-wiki)
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

/**
 * Наивное декодирование чанка потока.
 *
 * `.toString()` на отдельном чанке создаёт декодер на один чанк. Многобайтный
 * символ UTF-8, попавший на границу чанков, декодируется половинами и
 * превращается в два U+FFFD. Дефект недетерминированный: зависит от того, где
 * ядро нарежет поток. В августе 2026 он уронил четыре релиза подряд —
 * побайтовое сравнение двух ответов tools/list расходилось, хотя сервер отдавал
 * один и тот же список (исправлено в d5de3d88).
 *
 * Правило нужно именно потому, что защита из d5de3d88 (setEncoding + guard'ы)
 * привязана к существующим точкам приёма: новый spawn с новым слушателем
 * никакой guard не поймает.
 */
const CHUNK_DECODE_MESSAGE =
  'Декодирование чанка по одному рвёт многобайтный UTF-8 на границе чанка ' +
  '(символ на стыке превращается в U+FFFD). Переведи поток в setEncoding("utf8") — ' +
  'один разделяемый декодер на весь поток — и принимай чанк через assertUtf8Chunk(). ' +
  'История дефекта: коммит d5de3d88.';

const NO_NAIVE_CHUNK_DECODE = [
  'error',
  {
    // .toString() где угодно внутри инлайнового обработчика .on('data', ...)
    selector:
      "CallExpression[callee.property.name='on'][arguments.0.value='data'] > :matches(ArrowFunctionExpression, FunctionExpression) CallExpression[callee.property.name='toString']",
    message: CHUNK_DECODE_MESSAGE,
  },
  {
    // Обработчик, переданный по имени, под первый селектор не попадает,
    // поэтому ловим сам идиом накопления: `buffer += chunk.toString()`.
    selector: "AssignmentExpression[operator='+='][right.callee.property.name='toString']",
    message: CHUNK_DECODE_MESSAGE,
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
 * Scripts config — CLI-утилиты релизного гейта в каталогах scripts/ у серверов.
 *
 * Отдельный профиль, а не переиспользование src: это исполняемые скрипты, где
 * console.log — это вывод, а не забытая отладка, а размеры файлов на порядок
 * больше, чем допускает src. Пороги размера — потолок «не расти дальше», а не
 * цель: запланирован вынос транспортного низа харнессов в общий компонент,
 * после него пороги нужно опустить.
 */
function makeScriptsConfig({ complexity, maxDepth, maxLines, maxLinesPerFunction, maxParams, cognitiveComplexity }) {
  return {
    files: ['scripts/**/*.ts'],
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

      complexity: ['warn', complexity],
      'max-depth': ['warn', maxDepth],
      'max-lines': ['warn', maxLines],
      'max-lines-per-function': ['warn', maxLinesPerFunction],
      'max-params': ['warn', maxParams],

      'sonarjs/cognitive-complexity': ['warn', cognitiveComplexity],
      'sonarjs/no-identical-functions': 'off',
      ...COMMON_SONARJS_RULES,

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': COMMON_UNUSED_VARS,
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Скрипт печатает в stdout/stderr — это его интерфейс.
      'no-console': 'off',
      // Скрипт завершается кодом возврата.
      'no-process-exit': 'off',

      'no-restricted-syntax': NO_NAIVE_CHUNK_DECODE,
      ...COMMON_GENERAL_RULES,
    },
  };
}

/**
 * Пороги размера для scripts — замер по факту (максимумы на 2026-08-19:
 * файл 1021 строка, функция 513, complexity 16, cognitive 15, depth 3,
 * params 5) плюс небольшой запас. Это потолок «дальше не расти», а не цель.
 * После запланированного выноса транспортного низа харнессов в общий
 * компонент пороги нужно опустить — иначе они перестанут что-либо ловить.
 */
const SERVER_SCRIPTS_THRESHOLDS = {
  complexity: 20,
  maxDepth: 5,
  maxLines: 1100,
  maxLinesPerFunction: 550,
  maxParams: 5,
  cognitiveComplexity: 20,
};

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
 * Server config — чуть мягче для серверов (yandex-tracker, yandex-wiki)
 */
export function serverConfig() {
  return [
    COMMON_IGNORES,
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
    makeScriptsConfig(SERVER_SCRIPTS_THRESHOLDS),
    prettierConfig,
  ];
}

/**
 * Scripts config для общих скриптов сборки в packages/servers/scripts.
 * Каталог не является npm-workspace, поэтому turbo до него не дотягивается —
 * его линтует отдельная корневая команда через packages/servers/eslint.config.js.
 */
export function serversScriptsConfig() {
  return [COMMON_IGNORES, makeScriptsConfig(SERVER_SCRIPTS_THRESHOLDS), prettierConfig];
}
