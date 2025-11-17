# Отчёт по аудиту миграции на монорепозиторий

**Дата:** 2025-11-17 07:58:17
**Базовый коммит:** 7c606ca^
**Коммит миграции:** 7c606ca

---

## 📊 Executive Summary

- **Файлов до миграции:** 291
- **Файлов после миграции:** 334
- **Удалено файлов:** 249

### Категории удалений:

- Source files: 163
- Test files: 48
- Config files: 2
- Documentation: 28
- Scripts: 5

---

## 🔴 Критические находки

### Удалённые source files

```
scripts/add-tool-metadata.ts
scripts/generate-tool-index.ts
scripts/validate-tool-registration.ts
src/cli/bin/mcp-connect.ts
src/cli/commands/connect.command.ts
src/cli/commands/disconnect.command.ts
src/cli/commands/list.command.ts
src/cli/commands/status.command.ts
src/cli/commands/validate.command.ts
src/cli/connectors/base/base-connector.ts
src/cli/connectors/base/connector.interface.ts
src/cli/connectors/claude-code/claude-code.connector.ts
src/cli/connectors/claude-desktop/claude-desktop.connector.ts
src/cli/connectors/codex/codex.connector.ts
src/cli/connectors/registry.ts
src/cli/utils/command-executor.ts
src/cli/utils/config-manager.ts
src/cli/utils/file-manager.ts
src/cli/utils/interactive-prompter.ts
src/cli/utils/logger.ts
... и ещё 143 файлов
```

### Потерянные npm scripts

- `audit:lockfile`
- `audit:secrets`
- `audit:socket`
- `depcruise`
- `depcruise:graph`
- `dev:debug`
- `format`
- `format:check`
- `generate:index`
- `knip`
- `lint`
- `lint:fix`
- `mcp:validate`
- `postinstall`
- `prebuild`
- `prepare`
- `prepublishOnly`
- `test:changed`
- `test:integration`
- `test:ui`
- `test:unit`
- `typecheck:tests`
- `validate`
- `validate:architecture`
- `validate:build`
- `validate:code`
- `validate:docs`
- `validate:security`
- `validate:tests`
- `watch`

### Потерянные dependencies

- `@iarna/toml`
- `@modelcontextprotocol/sdk`
- `axios`
- `chalk`
- `commander`
- `inquirer`
- `inversify`
- `ora`
- `p-limit`
- `pino`
- `pino-pretty`
- `rotating-file-stream`
- `zod`

---

## 🟡 Некритические находки

### Удалённые тесты

Всего: 48 файлов

См. `deleted-tests.txt`

### Удалённая документация

Всего: 28 файлов

См. `deleted-docs.txt`

---

## ✅ Анализ коммита 88bf8aa

Категории удалений:

```
      1 CLI: src/cli/README.md
      1 CLI: src/cli/bin/mcp-connect.ts
      1 CLI: src/cli/commands/connect.command.ts
      1 CLI: src/cli/commands/disconnect.command.ts
      1 CLI: src/cli/commands/list.command.ts
      1 CLI: src/cli/commands/status.command.ts
      1 CLI: src/cli/commands/validate.command.ts
      1 CLI: src/cli/connectors/base/base-connector.ts
      1 CLI: src/cli/connectors/base/connector.interface.ts
      1 CLI: src/cli/connectors/claude-code/claude-code.connector.ts
      1 CLI: src/cli/connectors/claude-desktop/claude-desktop.connector.ts
      1 CLI: src/cli/connectors/codex/codex.connector.ts
      1 CLI: src/cli/connectors/gemini/gemini.connector.ts
      1 CLI: src/cli/connectors/qwen/qwen.connector.ts
      1 CLI: src/cli/connectors/registry.ts
      1 CLI: src/cli/tsconfig.json
      1 CLI: src/cli/utils/command-executor.ts
      1 CLI: src/cli/utils/config-manager.ts
      1 CLI: src/cli/utils/file-manager.ts
      1 CLI: src/cli/utils/interactive-prompter.ts
      1 CLI: src/cli/utils/logger.ts
      1 OTHER: yandex_tracker_client
      1 SOURCE: src/composition-root/README.md
      1 SOURCE: src/composition-root/container.ts
      1 SOURCE: src/composition-root/definitions/index.ts
      1 SOURCE: src/composition-root/definitions/operation-definitions.ts
      1 SOURCE: src/composition-root/definitions/tool-definitions.ts
      1 SOURCE: src/composition-root/index.ts
      1 SOURCE: src/composition-root/types.ts
      1 SOURCE: src/constants.ts
      1 SOURCE: src/index.ts
      1 SOURCE: src/infrastructure/README.md
      1 SOURCE: src/infrastructure/async/index.ts
      1 SOURCE: src/infrastructure/async/parallel-executor.ts
      1 SOURCE: src/infrastructure/cache/cache-manager.interface.ts
      1 SOURCE: src/infrastructure/cache/entity-cache-key.ts
      1 SOURCE: src/infrastructure/cache/index.ts
      1 SOURCE: src/infrastructure/cache/no-op-cache.ts
      1 SOURCE: src/infrastructure/config.ts
      1 SOURCE: src/infrastructure/http/client/http-client.ts
      1 SOURCE: src/infrastructure/http/client/http-config.interface.ts
      1 SOURCE: src/infrastructure/http/client/index.ts
      1 SOURCE: src/infrastructure/http/error/error-mapper.ts
      1 SOURCE: src/infrastructure/http/error/index.ts
      1 SOURCE: src/infrastructure/http/index.ts
      1 SOURCE: src/infrastructure/http/retry/exponential-backoff.strategy.ts
      1 SOURCE: src/infrastructure/http/retry/index.ts
      1 SOURCE: src/infrastructure/http/retry/retry-handler.ts
      1 SOURCE: src/infrastructure/http/retry/retry-strategy.interface.ts
      1 SOURCE: src/infrastructure/index.ts
      1 SOURCE: src/infrastructure/logging/README.md
      1 SOURCE: src/infrastructure/logging/index.ts
      1 SOURCE: src/infrastructure/logging/logger.ts
      1 SOURCE: src/mcp/README.md
      1 SOURCE: src/mcp/index.ts
      1 SOURCE: src/mcp/search/README.md
      1 SOURCE: src/mcp/search/constants.ts
      1 SOURCE: src/mcp/search/generated-index.ts
      1 SOURCE: src/mcp/search/index.ts
      1 SOURCE: src/mcp/search/scoring/strategy-weights.ts
      1 SOURCE: src/mcp/search/strategies/category-search.strategy.ts
      1 SOURCE: src/mcp/search/strategies/description-search.strategy.ts
      1 SOURCE: src/mcp/search/strategies/fuzzy-search.strategy.ts
      1 SOURCE: src/mcp/search/strategies/index.ts
      1 SOURCE: src/mcp/search/strategies/name-search.strategy.ts
      1 SOURCE: src/mcp/search/strategies/search-strategy.interface.ts
      1 SOURCE: src/mcp/search/strategies/weighted-combined.strategy.ts
      1 SOURCE: src/mcp/search/tool-search-engine.ts
      1 SOURCE: src/mcp/search/types.ts
      1 SOURCE: src/mcp/tool-registry.ts
      1 SOURCE: src/mcp/tools/api/index.ts
      1 SOURCE: src/mcp/tools/api/issues/changelog/get-issue-changelog.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/changelog/get-issue-changelog.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/changelog/get-issue-changelog.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/changelog/index.ts
      1 SOURCE: src/mcp/tools/api/issues/create/create-issue.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/create/create-issue.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/create/create-issue.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/create/index.ts
      1 SOURCE: src/mcp/tools/api/issues/find/find-issues.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/find/find-issues.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/find/find-issues.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/find/index.ts
      1 SOURCE: src/mcp/tools/api/issues/get/get-issues.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/get/get-issues.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/get/get-issues.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/get/index.ts
      1 SOURCE: src/mcp/tools/api/issues/index.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/execute/index.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/execute/transition-issue.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/execute/transition-issue.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/execute/transition-issue.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/get/get-issue-transitions.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/get/get-issue-transitions.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/get/get-issue-transitions.tool.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/get/index.ts
      1 SOURCE: src/mcp/tools/api/issues/transitions/index.ts
      1 SOURCE: src/mcp/tools/api/issues/update/index.ts
      1 SOURCE: src/mcp/tools/api/issues/update/update-issue.definition.ts
      1 SOURCE: src/mcp/tools/api/issues/update/update-issue.schema.ts
      1 SOURCE: src/mcp/tools/api/issues/update/update-issue.tool.ts
      1 SOURCE: src/mcp/tools/base/base-definition.ts
      1 SOURCE: src/mcp/tools/base/base-tool.ts
      1 SOURCE: src/mcp/tools/base/index.ts
      1 SOURCE: src/mcp/tools/base/tool-metadata.ts
      1 SOURCE: src/mcp/tools/common/README.md
      1 SOURCE: src/mcp/tools/common/index.ts
      1 SOURCE: src/mcp/tools/common/schemas/expand.schema.ts
      1 SOURCE: src/mcp/tools/common/schemas/fields.schema.ts
      1 SOURCE: src/mcp/tools/common/schemas/index.ts
      1 SOURCE: src/mcp/tools/common/schemas/issue-key.schema.ts
      1 SOURCE: src/mcp/tools/common/utils/index.ts
      1 SOURCE: src/mcp/tools/common/utils/safety-warning-builder.ts
      1 SOURCE: src/mcp/tools/common/utils/tool-name.ts
      1 SOURCE: src/mcp/tools/helpers/demo/demo.definition.ts
      1 SOURCE: src/mcp/tools/helpers/demo/demo.schema.ts
      1 SOURCE: src/mcp/tools/helpers/demo/demo.tool.ts
      1 SOURCE: src/mcp/tools/helpers/demo/index.ts
      1 SOURCE: src/mcp/tools/helpers/index.ts
      1 SOURCE: src/mcp/tools/helpers/issue-url/index.ts
      1 SOURCE: src/mcp/tools/helpers/issue-url/issue-url.definition.ts
      1 SOURCE: src/mcp/tools/helpers/issue-url/issue-url.schema.ts
      1 SOURCE: src/mcp/tools/helpers/issue-url/issue-url.tool.ts
      1 SOURCE: src/mcp/tools/helpers/search/index.ts
      1 SOURCE: src/mcp/tools/helpers/search/search-tools.definition.ts
      1 SOURCE: src/mcp/tools/helpers/search/search-tools.schema.ts
      1 SOURCE: src/mcp/tools/helpers/search/search-tools.tool.ts
      1 SOURCE: src/mcp/tools/index.ts
      1 SOURCE: src/mcp/tools/ping.tool.ts
      1 SOURCE: src/mcp/utils/batch-result-processor.ts
      1 SOURCE: src/mcp/utils/index.ts
      1 SOURCE: src/mcp/utils/response-field-filter.ts
      1 SOURCE: src/mcp/utils/result-logger.ts
      1 SOURCE: src/tracker_api/api_operations/README.md
      1 SOURCE: src/tracker_api/api_operations/base-operation.ts
      1 SOURCE: src/tracker_api/api_operations/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/changelog/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/create/create-issue.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/create/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/find/find-issues.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/find/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/get-issues.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/transitions/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/transitions/transition-issue.operation.ts
      1 SOURCE: src/tracker_api/api_operations/issue/update/index.ts
      1 SOURCE: src/tracker_api/api_operations/issue/update/update-issue.operation.ts
      1 SOURCE: src/tracker_api/api_operations/user/index.ts
      1 SOURCE: src/tracker_api/api_operations/user/ping.operation.ts
      1 SOURCE: src/tracker_api/dto/README.md
      1 SOURCE: src/tracker_api/dto/index.ts
      1 SOURCE: src/tracker_api/dto/issue/create-issue.dto.ts
      1 SOURCE: src/tracker_api/dto/issue/dto.factories.ts
      1 SOURCE: src/tracker_api/dto/issue/execute-transition.dto.ts
      1 SOURCE: src/tracker_api/dto/issue/find-issues-input.dto.ts
      1 SOURCE: src/tracker_api/dto/issue/index.ts
      1 SOURCE: src/tracker_api/dto/issue/search-issues.dto.ts
      1 SOURCE: src/tracker_api/dto/issue/update-issue.dto.ts
      1 SOURCE: src/tracker_api/entities/README.md
      1 SOURCE: src/tracker_api/entities/changelog.entity.ts
      1 SOURCE: src/tracker_api/entities/entity.factories.ts
      1 SOURCE: src/tracker_api/entities/index.ts
      1 SOURCE: src/tracker_api/entities/issue-type.entity.ts
      1 SOURCE: src/tracker_api/entities/issue.entity.ts
      1 SOURCE: src/tracker_api/entities/priority.entity.ts
      1 SOURCE: src/tracker_api/entities/queue.entity.ts
      1 SOURCE: src/tracker_api/entities/status.entity.ts
      1 SOURCE: src/tracker_api/entities/transition.entity.ts
      1 SOURCE: src/tracker_api/entities/types.ts
      1 SOURCE: src/tracker_api/entities/user.entity.ts
      1 SOURCE: src/tracker_api/facade/index.ts
      1 SOURCE: src/tracker_api/facade/yandex-tracker.facade.ts
      1 SOURCE: src/tracker_api/index.ts
      1 SOURCE: src/types.ts
      1 TESTS: tests/helpers/mock-factories.ts
      1 TESTS: tests/unit/cli/connectors/claude-code/claude-code.connector.test.ts
      1 TESTS: tests/unit/cli/connectors/claude-desktop/claude-desktop.connector.test.ts
      1 TESTS: tests/unit/cli/connectors/codex/codex.connector.test.ts
      1 TESTS: tests/unit/cli/connectors/gemini/gemini.connector.test.ts
      1 TESTS: tests/unit/cli/connectors/qwen/qwen.connector.test.ts
      1 TESTS: tests/unit/cli/connectors/registry.test.ts
      1 TESTS: tests/unit/composition-root/container.test.ts
      1 TESTS: tests/unit/helpers/mock-factories.test.ts
      1 TESTS: tests/unit/infrastructure/async/parallel-executor.test.ts
      1 TESTS: tests/unit/infrastructure/cache/entity-cache-key.test.ts
      1 TESTS: tests/unit/infrastructure/cache/no-op-cache.test.ts
      1 TESTS: tests/unit/infrastructure/config.test.ts
      1 TESTS: tests/unit/infrastructure/http/client/http-client.test.ts
      1 TESTS: tests/unit/infrastructure/http/error/error-mapper.test.ts
      1 TESTS: tests/unit/infrastructure/http/retry/exponential-backoff.strategy.test.ts
      1 TESTS: tests/unit/infrastructure/http/retry/retry-handler.test.ts
      1 TESTS: tests/unit/infrastructure/logging/logger.test.ts
      1 TESTS: tests/unit/mcp/search/strategies/category-search.strategy.test.ts
      1 TESTS: tests/unit/mcp/search/strategies/description-search.strategy.test.ts
      1 TESTS: tests/unit/mcp/search/strategies/fuzzy-search.strategy.test.ts
      1 TESTS: tests/unit/mcp/search/strategies/name-search.strategy.test.ts
      1 TESTS: tests/unit/mcp/search/strategies/weighted-combined.strategy.test.ts
      1 TESTS: tests/unit/mcp/search/tool-search-engine.test.ts
      1 TESTS: tests/unit/mcp/tool-registry.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/changelog/get-issue-changelog.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/create/create-issue.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/find/find-issues.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/get/get-issues.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/transitions/execute/transition-issue.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/transitions/get/get-issue-transitions.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/api/issues/update/update-issue.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/base/base-definition.test.ts
      1 TESTS: tests/unit/mcp/tools/helpers/demo/demo.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/helpers/issue-url/issue-url.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/helpers/search/search-tools.tool.test.ts
      1 TESTS: tests/unit/mcp/tools/ping.tool.test.ts
      1 TESTS: tests/unit/mcp/utils/batch-result-processor.test.ts
      1 TESTS: tests/unit/mcp/utils/response-field-filter.test.ts
      1 TESTS: tests/unit/mcp/utils/result-logger.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/base-operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/create/create-issue.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/find/find-issues.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/get-issues.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/transitions/execute/transition-issue.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/issue/update/update-issue.operation.test.ts
      1 TESTS: tests/unit/tracker_api/api_operations/user/ping.operation.test.ts
      1 TESTS: tests/unit/tracker_api/dto/issue/dto.factories.test.ts
      1 TESTS: tests/unit/tracker_api/entities/entity.factories.test.ts
      1 TESTS: tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts
```

---

## 📋 Рекомендации

1. **Проверить восстановленные CLI tools:**
   - ✅ CLI tools восстановлены в коммите 35752e7
   - Убедиться, что все функции работают

2. **Проверить scripts директорию:**
   - Сравнить `scripts/` до и после миграции
   - Восстановить утилитные скрипты если нужно

3. **Проверить npm scripts:**
   - ⚠️ Восстановить потерянные scripts

4. **Проверить dependencies:**
   - ⚠️ Проверить необходимость восстановления зависимостей

---

## 🔍 Детальные файлы

Все детальные списки находятся в директории:
`.agentic-planning/migration-audit/`

- `files-before.txt` - Все файлы до миграции
- `files-after.txt` - Все файлы после миграции
- `deleted-files.txt` - Полный список удалённых файлов
- `deleted-source.txt` - Удалённые source files
- `deleted-tests.txt` - Удалённые тесты
- `deleted-configs.txt` - Удалённые конфиги
- `deleted-docs.txt` - Удалённая документация
- `deleted-scripts.txt` - Удалённые скрипты
- `scripts-lost.txt` - Потерянные npm scripts
- `deps-lost.txt` - Потерянные dependencies

