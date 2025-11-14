/**
 * Dependency Cruiser Configuration
 *
 * Валидирует архитектурные правила проекта:
 * - Layered architecture (направленность зависимостей)
 * - Изоляция операций (через Facade)
 * - Запрет циклических зависимостей
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ================================================
    // 1. LAYERED ARCHITECTURE
    // ================================================

    {
      name: 'tracker-api-no-mcp',
      severity: 'error',
      comment: 'tracker_api — низкоуровневый слой, не должен знать о MCP layer',
      from: {
        path: '^src/tracker_api/',
      },
      to: {
        path: '^src/mcp/',
      },
    },

    {
      name: 'infrastructure-no-business-layers',
      severity: 'error',
      comment: 'Infrastructure — переиспользуемый слой, не зависит от бизнес-логики',
      from: {
        path: '^src/infrastructure/',
      },
      to: {
        path: '^src/(tracker_api|mcp|composition-root)/',
      },
    },

    // ================================================
    // 2. MCP LAYER ISOLATION
    // ================================================

    {
      name: 'mcp-uses-facade-only',
      severity: 'error',
      comment: 'MCP tools должны использовать YandexTrackerFacade, не Operations напрямую',
      from: {
        path: '^src/mcp/',
      },
      to: {
        path: '^src/tracker_api/',
        pathNot: [
          // Разрешены:
          '^src/tracker_api/facade/',     // Facade (основной интерфейс)
          '^src/tracker_api/entities/',   // Entity типы
          '^src/tracker_api/dto/',        // DTO типы
        ],
      },
    },

    // ================================================
    // 3. OPERATIONS ISOLATION
    // ================================================

    {
      name: 'operations-isolation',
      severity: 'warn',  // warn чтобы не блокировать development
      comment: 'Operations импортируются только через Facade или Composition Root',
      from: {
        path: '^src/',
        pathNot: [
          // Исключения (разрешено импортировать operations):
          '^src/tracker_api/facade/',              // Facade координирует operations
          '^src/composition-root/container\\.ts$', // DI контейнер регистрирует все зависимости
          '^src/tracker_api/operations/',          // Operations могут импортировать друг друга
        ],
      },
      to: {
        path: '^src/tracker_api/operations/',
      },
    },

    // ================================================
    // 4. CIRCULAR DEPENDENCIES
    // ================================================

    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Циклические зависимости запрещены',
      from: {
        pathNot: '^node_modules',
      },
      to: {
        pathNot: '^node_modules',
        circular: true,
      },
    },

    // ================================================
    // 5. COMPOSITION ROOT ISOLATION
    // ================================================

    {
      name: 'composition-root-top-level',
      severity: 'error',
      comment: 'Composition Root — высший слой, ничто не должно импортировать его (кроме entry point и файлов внутри composition-root)',
      from: {
        path: '^src/',
        pathNot: [
          '^src/index\\.ts$',             // Entry point может импортировать
          '^src/composition-root/',       // Файлы внутри composition-root могут импортировать друг друга
        ],
      },
      to: {
        path: '^src/composition-root/',
      },
    },
  ],

  options: {
    // Не следовать в node_modules
    doNotFollow: {
      path: 'node_modules',
    },

    // Исключить из анализа
    exclude: {
      path: [
        '\\.test\\.ts$',
        '\\.spec\\.ts$',
        'dist/',
        'tests/',
      ],
    },

    // Использовать TypeScript для разрешения путей
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },

    // Репортер
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
