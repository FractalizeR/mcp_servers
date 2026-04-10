## [0.3.8](https://github.com/FractalizeR/mcp_servers/compare/v0.3.7...v0.3.8) (2026-04-10)

### Bug Fixes

* **ci:** триггер релиза для прогона OIDC debug step ([7e469b2](https://github.com/FractalizeR/mcp_servers/commit/7e469b2ce85346d064748f342f8aadc21dfdd60c))

## [0.3.7](https://github.com/FractalizeR/mcp_servers/compare/v0.3.6...v0.3.7) (2026-04-10)

### Bug Fixes

* **ci:** явно задать id-token: write на уровне publish-npm job ([1627f89](https://github.com/FractalizeR/mcp_servers/commit/1627f892f76bed18e06542acd1e30908a80e6c6f))

## [0.3.6](https://github.com/FractalizeR/mcp_servers/compare/v0.3.5...v0.3.6) (2026-04-10)

### Bug Fixes

* **ci:** починить npm publish — идемпотентность, fail-fast, verify ([1c41863](https://github.com/FractalizeR/mcp_servers/commit/1c418635d04258368899b18c2602368286263dc6))

## [0.3.5](https://github.com/FractalizeR/mcp_servers/compare/v0.3.4...v0.3.5) (2026-04-10)

### Bug Fixes

* **cli:** заменить prompt type 'list' на 'select' для inquirer@13 ([4978c92](https://github.com/FractalizeR/mcp_servers/commit/4978c92d5b5fba55f25f3460a2d762fa04bfdf48))

## [0.3.4](https://github.com/FractalizeR/mcp_servers/compare/v0.3.3...v0.3.4) (2026-03-25)

### Bug Fixes

* унифицировать validate и validate:quiet через единый скрипт ([3ee31b1](https://github.com/FractalizeR/mcp_servers/commit/3ee31b1db41c42dd52baf473b2b7fa3a8fdbb913))

## [0.3.3](https://github.com/FractalizeR/mcp_servers/compare/v0.3.2...v0.3.3) (2026-03-24)

### Refactoring

* консолидация конфигурации инструментов качества кода ([cd5d148](https://github.com/FractalizeR/mcp_servers/commit/cd5d14892199c968955f7c65ac5f2c087b0d0159))

## [0.3.2](https://github.com/FractalizeR/mcp_servers/compare/v0.3.1...v0.3.2) (2026-03-24)

### Bug Fixes

* **ci:** добавить wrapper-пакеты в release pipeline ([ce1e24d](https://github.com/FractalizeR/mcp_servers/commit/ce1e24dcd27befe96b3a1f35b28819613ef746e4))
* **ci:** исправить workspace resolution и release pipeline ([82d644f](https://github.com/FractalizeR/mcp_servers/commit/82d644f6fded00430d50dc6cd07a255dd38d76b1))
* добавить server-пакеты в knip ignoreDependencies для wrappers ([68891b5](https://github.com/FractalizeR/mcp_servers/commit/68891b52e7344c88ad1cf789c7814ae6d773a2c5))
* зафиксировать vite ^7 через overrides (vite 8 ломает # imports) ([0d8a2ad](https://github.com/FractalizeR/mcp_servers/commit/0d8a2ad7642b622fd7529808e2f21823e50433fc))
* исключить duplicate exports из knip strict проверки ([20a8083](https://github.com/FractalizeR/mcp_servers/commit/20a808310621e39a4959c534836f5ef0f1a785d6))
* синхронизация deps и manifest после ревью ([a6afac7](https://github.com/FractalizeR/mcp_servers/commit/a6afac75d1f9c760d5aa5436bba5b7e78ef8f838))

## [0.2.4](https://github.com/FractalizeR/mcp_servers/compare/v0.2.3...v0.2.4) (2026-03-24)

### Bug Fixes

* исправить bin в wrapper-пакетах ([9b1a659](https://github.com/FractalizeR/mcp_servers/commit/9b1a6595d7f865f4b88749abe0211081ead7af70))

## [0.2.2](https://github.com/FractalizeR/mcp_servers/compare/v0.2.1...v0.2.2) (2025-12-09)

### Bug Fixes

* **ci:** добавить сборку всех пакетов перед MCPB ([51c52d9](https://github.com/FractalizeR/mcp_servers/commit/51c52d99dbca4cc89083a5396835b3ba5f16e163))

## [0.2.1](https://github.com/FractalizeR/mcp_servers/compare/v0.2.0...v0.2.1) (2025-12-09)

### Bug Fixes

* **ci:** исправить сборку MCPB бандлов в workflow ([cdb4b81](https://github.com/FractalizeR/mcp_servers/commit/cdb4b8136b1de84580c6fffdcfb8f4b6700eb8cc))

## [0.2.0](https://github.com/FractalizeR/mcp_servers/compare/v0.1.4...v0.2.0) (2025-12-09)

### Features

* **ci:** собирать MCPB для всех серверов с фиксированными именами ([27bc4d0](https://github.com/FractalizeR/mcp_servers/commit/27bc4d0c4aef75ea7aae5cae8bc1c7f2dcd0efb4))

## [0.1.4](https://github.com/FractalizeR/mcp_servers/compare/v0.1.3...v0.1.4) (2025-12-09)

### Bug Fixes

* **ci:** обновлять manifest.json при релизе для корректной версии MCPB ([b6689a3](https://github.com/FractalizeR/mcp_servers/commit/b6689a3a03d1f71f31b7b55d2abbdbc5100ac5e8))

## [0.1.3](https://github.com/FractalizeR/mcp_servers/compare/v0.1.2...v0.1.3) (2025-12-09)

### Bug Fixes

* **ci:** использовать semantic-release-action для корректных outputs ([e74651c](https://github.com/FractalizeR/mcp_servers/commit/e74651c1acd1536019c9ffe131b7d0951e76333a))

## [0.1.2](https://github.com/FractalizeR/mcp_servers/compare/v0.1.1...v0.1.2) (2025-12-09)

### Bug Fixes

* **ci:** вернуть триггер на main ветку ([0abb8d4](https://github.com/FractalizeR/mcp_servers/commit/0abb8d4e02de697f8739f5d82d30d761db2e57ab))
* **ci:** исправить триггер workflow на master ветку ([a345b81](https://github.com/FractalizeR/mcp_servers/commit/a345b8161deccfd789ac4a1fd8a07a54a3685737))
* исправить версии внутренних зависимостей на ^0.1.1 ([515bf19](https://github.com/FractalizeR/mcp_servers/commit/515bf191ae36c051eb19a17fe94d2a0e56aa39c9))
* обновить package-lock.json для CI ([6678648](https://github.com/FractalizeR/mcp_servers/commit/66786489dbcaa8647475e6934b0c3ceb2f209153))
