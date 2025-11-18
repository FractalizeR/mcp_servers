# Changelog

All notable changes to `mcp-server-yandex-tracker` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-18

### 🎉 Highlights

**Масштабное расширение API:** Покрытие Yandex.Tracker API увеличено с 6% до 53% (1 → 9 категорий).
**35+ новых MCP инструментов** для работы с комментариями, вложениями, чек-листами, проектами, очередями и другими сущностями.

### ✨ Added - New API Categories

#### Comments API (4 tools)
- `fr_yandex_tracker_add_comment` - Add comment to issue
- `fr_yandex_tracker_get_comments` - Get all issue comments
- `fr_yandex_tracker_edit_comment` - Edit comment
- `fr_yandex_tracker_delete_comment` - Delete comment

#### Links API (3 tools)
- `fr_yandex_tracker_create_link` - Create link between issues
- `fr_yandex_tracker_get_issue_links` - Get issue links
- `fr_yandex_tracker_delete_link` - Delete link

#### Queues API (6 tools)
- `fr_yandex_tracker_create_queue` - Create new queue
- `fr_yandex_tracker_get_queues` - Get list of queues
- `fr_yandex_tracker_get_queue` - Get queue information
- `fr_yandex_tracker_update_queue` - Update queue
- `fr_yandex_tracker_get_queue_fields` - Get queue fields
- `fr_yandex_tracker_manage_queue_access` - Manage queue access

#### Attachments API (5 tools)
- `fr_yandex_tracker_upload_attachment` - Upload file to issue
- `fr_yandex_tracker_get_attachments` - Get list of attachments
- `fr_yandex_tracker_download_attachment` - Download attachment
- `fr_yandex_tracker_get_thumbnail` - Get image thumbnail
- `fr_yandex_tracker_delete_attachment` - Delete attachment

#### Checklists API (4 tools)
- `fr_yandex_tracker_add_checklist_item` - Add checklist item
- `fr_yandex_tracker_get_checklist` - Get issue checklist
- `fr_yandex_tracker_update_checklist_item` - Update checklist item
- `fr_yandex_tracker_delete_checklist_item` - Delete checklist item

#### Worklog API (4 tools)
- `fr_yandex_tracker_create_worklog` - Add time record
- `fr_yandex_tracker_get_worklogs` - Get issue time records
- `fr_yandex_tracker_update_worklog` - Update time record
- `fr_yandex_tracker_delete_worklog` - Delete time record

#### Projects API (5 tools)
- `fr_yandex_tracker_create_project` - Create project
- `fr_yandex_tracker_get_projects` - Get list of projects
- `fr_yandex_tracker_update_project` - Update project
- `fr_yandex_tracker_delete_project` - Delete project
- `fr_yandex_tracker_get_project_queues` - Get project queues

#### Components API (4 tools)
- `fr_yandex_tracker_create_component` - Create component
- `fr_yandex_tracker_get_components` - Get queue components
- `fr_yandex_tracker_update_component` - Update component
- `fr_yandex_tracker_delete_component` - Delete component

### Added - Architecture & Infrastructure

- Tool search system with 5 strategies (via `@mcp-framework/search`)
- `search_tools` MCP tool for Claude to discover available tools
- Compile-time tool indexing (performance improvement)
- Enhanced documentation structure (README per package)
- Migration guide (MIGRATION.md)
- Monorepo architecture documentation (ARCHITECTURE.md)
- E2E tests for complex workflows
- Comprehensive test coverage (≥90%) for all new APIs

### Changed

- **BREAKING:** Migrated to monorepo structure
- **BREAKING:** Infrastructure extracted to `@mcp-framework/infrastructure`
- **BREAKING:** Core framework extracted to `@mcp-framework/core`
- **BREAKING:** Search system extracted to `@mcp-framework/search`
- **BREAKING:** `BaseTool` is now generic `BaseTool<YandexTrackerFacade>` (for developers extending the codebase)

### Fixed

- Improved TypeScript project references for faster builds
- Enhanced dependency graph validation
- Fixed failing integration tests
- Improved error handling in all API operations
- Optimized batch operations

### 📊 Metrics

- **API Coverage**: 6% → 53% (1 → 9 categories)
- **MCP Tools**: 7 → 42+ (6x growth)
- **Test Coverage**: ≥90% for all modules
- **Documentation**: Complete for all new APIs

### Notes

- **For end users:** No configuration changes required (fully backward compatible)
- **For developers:** See [MIGRATION.md](../../MIGRATION.md) for upgrade guide
- Framework packages (`@mcp-framework/*`) are now available for reuse in other projects

## [1.x.x] - Previous Versions

See git history for versions 1.0.0 - 1.x.x (single package architecture).

### Key Features in 1.x
- Batch operations for Yandex.Tracker API v3
- MCP tools for issues, users, comments
- InversifyJS dependency injection
- Comprehensive test coverage (≥80%)
- Production logging with Pino
- Field filtering for token optimization

---

For detailed migration instructions, see [MIGRATION.md](../../MIGRATION.md).
