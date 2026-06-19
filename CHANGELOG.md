## [1.5.2](https://github.com/FractalizeR/mcp_servers/compare/v1.5.1...v1.5.2) (2026-06-19)

### Bug Fixes

* **tracker:** changelog — восстановлен page в single-page режиме ([7056e08](https://github.com/FractalizeR/mcp_servers/commit/7056e08849d2787983cc07255194a8d76b9d0dcc))

## [1.5.1](https://github.com/FractalizeR/mcp_servers/compare/v1.5.0...v1.5.1) (2026-06-19)

### Bug Fixes

* **infra:** parseLinkHeader — регистронезависимый rel + multi-token ([8037c4e](https://github.com/FractalizeR/mcp_servers/commit/8037c4e5e6b264961c74ed08f31fad0a9157ddac))
* **tracker:** пагинация — стабильный hasNextPage, кеш-аудит, _search; +maxTotalItems ([a31d461](https://github.com/FractalizeR/mcp_servers/commit/a31d4610f6ad44143d8b6e0fbe4650d18d64db2e))

## [1.5.0](https://github.com/FractalizeR/mcp_servers/compare/v1.4.0...v1.5.0) (2026-06-18)

### Features

* **tracker:** полная пагинация всех list-эндпоинтов (этап 2) ([eb0f493](https://github.com/FractalizeR/mcp_servers/commit/eb0f49377387a5fdca6aababd55e22f9f2160f7c))

## [1.4.0](https://github.com/FractalizeR/mcp_servers/compare/v1.3.0...v1.4.0) (2026-06-18)

### Features

* **tracker:** общие схемы пагинации + paginatedFieldFilter (этап 1.3) ([cede233](https://github.com/FractalizeR/mcp_servers/commit/cede2335e24940e9c1aa99e9e1f90b479ffe1e78)), closes [#8](https://github.com/FractalizeR/mcp_servers/issues/8)

## [1.3.0](https://github.com/FractalizeR/mcp_servers/compare/v1.2.0...v1.3.0) (2026-06-18)

### Features

* **infra:** доступ к заголовкам ответа для пагинации ([079c737](https://github.com/FractalizeR/mcp_servers/commit/079c73712c183685ff935e122d53eab2d89c5b26))
* **tracker:** TrackerPaginator — проход по страницам (этап 1.2) ([8afa62d](https://github.com/FractalizeR/mcp_servers/commit/8afa62dd9f3ad6f00b108146562065858b1531ce))

## [1.2.0](https://github.com/FractalizeR/mcp_servers/compare/v1.1.1...v1.2.0) (2026-06-17)

### Features

* **core:** raw-API passthrough primitives + перевод tracker ([9cc0a3d](https://github.com/FractalizeR/mcp_servers/commit/9cc0a3d4a11eb5daef3922ecd0404893c08906aa))
* **ticktick:** инструмент raw_api_request (GET-only) ([0041e68](https://github.com/FractalizeR/mcp_servers/commit/0041e68c55bc7b765c8c1bd5e0aee1ef9d5c358c))
* **wiki:** инструмент raw_api_request (GET-only) ([7e5e455](https://github.com/FractalizeR/mcp_servers/commit/7e5e455be93c5abfe4590cd2104dae9614e24b71))

## [1.1.1](https://github.com/FractalizeR/mcp_servers/compare/v1.1.0...v1.1.1) (2026-06-17)

### Bug Fixes

* **tools:** сериализация массивов в query raw_api_request через запятую ([4976c7f](https://github.com/FractalizeR/mcp_servers/commit/4976c7f2d32591e5daa85d57655fada020505015))

## [1.1.0](https://github.com/FractalizeR/mcp_servers/compare/v1.0.1...v1.1.0) (2026-06-17)

### Features

* **tools:** raw_api_request — прямой GET к API Яндекс.Трекера ([9ae30dc](https://github.com/FractalizeR/mcp_servers/commit/9ae30dc6195a49032d4bbbb817dd2da61afcfa14))

## [1.0.1](https://github.com/FractalizeR/mcp_servers/compare/v1.0.0...v1.0.1) (2026-05-20)

### Bug Fixes

* **cli:** корректный scope в ClaudeCodeConnector ([ded12ec](https://github.com/FractalizeR/mcp_servers/commit/ded12ec65fb9e49525a567af7e07b2a587cb6905))

## [1.0.0](https://github.com/FractalizeR/mcp_servers/compare/v0.3.18...v1.0.0) (2026-05-20)

### ⚠ BREAKING CHANGES

* **cli:** agnostic framework + domain adapters for 3 MCP servers (#387)
* **cli:** удалены `BaseMCPServerConfig`, `safeFields` в
`ConfigManagerOptions`, generic-параметры коннекторов. Сигнатуры
`MCPConnector.connect`/`validateConfig` изменены.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

### Features

* **cli:** add cwd/disabled to ServerLaunchSpec, args readonly ([37614a7](https://github.com/FractalizeR/mcp_servers/commit/37614a7f5b3452f6e69475d32956bc75669931e4))
* **cli:** doctor command for self-diagnostics ([f33276b](https://github.com/FractalizeR/mcp_servers/commit/f33276b54cb17088f45ac1c943bddbb9de955a15))
* **cli:** node argv-aware executable path resolver ([42eedd1](https://github.com/FractalizeR/mcp_servers/commit/42eedd1d0f38908089e2b1585eceb7957bf310f4))
* **cli:** параллельный сбор статусов клиентов ([368a2b9](https://github.com/FractalizeR/mcp_servers/commit/368a2b9b70ae88d7766711eaa85cbf5c12d08b03))
* **servers:** doctor checks for all MCP servers ([75251ef](https://github.com/FractalizeR/mcp_servers/commit/75251efc1959ae7a512b0e3fe4e1dd17715886b7))
* **ticktick:** buildServerLaunch adapter ([12f961e](https://github.com/FractalizeR/mcp_servers/commit/12f961ed98d3e0f1450c6b87af46c0216e859eac))
* **tracker:** buildServerLaunch adapter + Yandex Cloud org type ([be99303](https://github.com/FractalizeR/mcp_servers/commit/be9930353bfd243233fa1857753e111d2b15602a))
* **wiki:** buildServerLaunch adapter + Yandex Cloud org type ([1afe20e](https://github.com/FractalizeR/mcp_servers/commit/1afe20e478755d449d095d341e6155a45c069a05))

### Bug Fixes

* **cli:** better UX for unknown client / save failures ([a640e34](https://github.com/FractalizeR/mcp_servers/commit/a640e3410f5bab9441d67f5a35b3b9b1cf48b007))
* **cli:** graceful Win32 APPDATA fallback, lazy config paths ([da44971](https://github.com/FractalizeR/mcp_servers/commit/da449715f206d245674f5ec1f42111ad16726075))
* **cli:** POSIX-portable stderr generation в command-executor test ([96e083f](https://github.com/FractalizeR/mcp_servers/commit/96e083f74c1a1ff3a8e4036ea20a245a2751b14b))
* **cli:** preserve stderr in CommandExecutor errors ([21f6b00](https://github.com/FractalizeR/mcp_servers/commit/21f6b00cf724f1a1326cde473e92f571fa904662))
* **cli:** use checkCommand for isInstalled when provided ([6460ac2](https://github.com/FractalizeR/mcp_servers/commit/6460ac217a78d19ac96aa9c08ca896e9f9e1453d))
* **cli:** парсить статус claude mcp list с таймаутом 5s ([7cb4adb](https://github.com/FractalizeR/mcp_servers/commit/7cb4adb1d76aafc258cee51a5bdb59da914c5fd3))
* **cli:** убрать промпт подтверждения, warn про plaintext-токен ([efbacf5](https://github.com/FractalizeR/mcp_servers/commit/efbacf5790745e1cb1d09098c749c4f855ec87de))
* **servers:** warn on unknown values in deserialize configs ([572df16](https://github.com/FractalizeR/mcp_servers/commit/572df1643cbd315c6f616c41e3fc1d52ff9af5e0))
* **ticktick:** correct doctor-check comment about secret storage ([8ed4baf](https://github.com/FractalizeR/mcp_servers/commit/8ed4baf9e55d52a7f5f540488161227042a91178))

### Performance

* **cli:** memoize getLaunchSpec in doctorCommand, label constant ([14ebd29](https://github.com/FractalizeR/mcp_servers/commit/14ebd2920da45b0d8a0214a8f746efcdcf979d51))

### Refactoring

* **cli:** agnostic framework + domain adapters for 3 MCP servers ([#387](https://github.com/FractalizeR/mcp_servers/issues/387)) ([d80a842](https://github.com/FractalizeR/mcp_servers/commit/d80a8423ab2fc4044ed671edbdf1b1bb5a7551c0))
* **cli:** make ConfigManager serialize required ([821d545](https://github.com/FractalizeR/mcp_servers/commit/821d5457b47039b80ddc397412ae29480fd8df6f))
* **cli:** remove internal types from public API ([8c22b10](https://github.com/FractalizeR/mcp_servers/commit/8c22b10af82b9cb12b2651c1df35287167ac6a99))
* **cli:** use execFile for claude commands; tighten parsing ([10c63d9](https://github.com/FractalizeR/mcp_servers/commit/10c63d9da74062951c036033bfba0604b6ed8afe))
* **cli:** объединить коннекторы в ConfigurableConnector + ClaudeCodeConnector ([47a33e6](https://github.com/FractalizeR/mcp_servers/commit/47a33e69224dcbe37ed7395b9ee6ed4cf4ab01a9))
* **cli:** убрать BaseMCPServerConfig, агностичный framework ([f560f14](https://github.com/FractalizeR/mcp_servers/commit/f560f14af712ca2fea067cb67d2663d58cc81527))
* **ticktick:** migrate CLI to agnostic framework API ([8e797ad](https://github.com/FractalizeR/mcp_servers/commit/8e797adede8d2ad83cfdd0a2fa141184ea287a85))
* **tracker:** migrate CLI to agnostic framework API ([337aab0](https://github.com/FractalizeR/mcp_servers/commit/337aab0ef3df0281f13b65154955266ae1a85b78))
* **wiki:** migrate CLI to agnostic framework API ([fc1087c](https://github.com/FractalizeR/mcp_servers/commit/fc1087c560a9f5196e8f370698e6be29b3fca118))

## [0.3.18](https://github.com/FractalizeR/mcp_servers/compare/v0.3.17...v0.3.18) (2026-04-16)

### Bug Fixes

* **config:** писать логи в ~/.cache вместо node_modules ([7cd4dc4](https://github.com/FractalizeR/mcp_servers/commit/7cd4dc440644ce9d2ca1114452a172f9413dcc98))

## [0.3.17](https://github.com/FractalizeR/mcp_servers/compare/v0.3.16...v0.3.17) (2026-04-10)

### Bug Fixes

* **ci:** убрать диагностические шаги, финальная чистая версия publish-npm ([f19dacc](https://github.com/FractalizeR/mcp_servers/commit/f19dacc6f4d5e6c70e771a6563d94a503ddeb847))

## [0.3.16](https://github.com/FractalizeR/mcp_servers/compare/v0.3.15...v0.3.16) (2026-04-10)

### Bug Fixes

* **ci:** декодировать claims OIDC-токена перед публикацией ([c8fe6dd](https://github.com/FractalizeR/mcp_servers/commit/c8fe6dd0b2b6b4951c08aa6146f23cd9d287f9fb))

## [0.3.15](https://github.com/FractalizeR/mcp_servers/compare/v0.3.14...v0.3.15) (2026-04-10)

### Bug Fixes

* **ci:** триггер релиза для прогона verbose publish diagnostic ([12ce28e](https://github.com/FractalizeR/mcp_servers/commit/12ce28e6cf9d0fa8b1942c35f824232f5bd09c2c))

## [0.3.14](https://github.com/FractalizeR/mcp_servers/compare/v0.3.13...v0.3.14) (2026-04-10)

### Bug Fixes

* **ci:** полный wipe npm auth config + трассировка источников ([837f82a](https://github.com/FractalizeR/mcp_servers/commit/837f82afdc7a13f07da23060866a56c841d712f0))

## [0.3.13](https://github.com/FractalizeR/mcp_servers/compare/v0.3.12...v0.3.13) (2026-04-10)

### Bug Fixes

* **ci:** явно обнулить NODE_AUTH_TOKEN + диагностика OIDC ([2c33fe3](https://github.com/FractalizeR/mcp_servers/commit/2c33fe30eae944892235d6f04ad673c387d4129c))

## [0.3.12](https://github.com/FractalizeR/mcp_servers/compare/v0.3.11...v0.3.12) (2026-04-10)

### Bug Fixes

* **ci:** починить sanity-check версии npm в publish-npm ([b0ecf8d](https://github.com/FractalizeR/mcp_servers/commit/b0ecf8d5798a2ac9b2d7fb0a77b05a6fdb7ddc44))

## [0.3.11](https://github.com/FractalizeR/mcp_servers/compare/v0.3.10...v0.3.11) (2026-04-10)

### Bug Fixes

* **ci:** публиковать через Node 24 (штатно несёт npm 11.x c OIDC) ([0a8abe7](https://github.com/FractalizeR/mcp_servers/commit/0a8abe7f321a5e56f7c4196235e269f0aa2deafc))

## [0.3.10](https://github.com/FractalizeR/mcp_servers/compare/v0.3.9...v0.3.10) (2026-04-10)

### Bug Fixes

* **ci:** обновить npm до 11.5.1+ для поддержки OIDC trusted publishing ([6b3d0c1](https://github.com/FractalizeR/mcp_servers/commit/6b3d0c1caff5fb28435dfa32fba3ceb093a86297))

## [0.3.9](https://github.com/FractalizeR/mcp_servers/compare/v0.3.8...v0.3.9) (2026-04-10)

### Bug Fixes

* **ci:** вычистить placeholder _authToken из .npmrc перед OIDC publish ([8bf70ba](https://github.com/FractalizeR/mcp_servers/commit/8bf70baa48f94074cf14aae273774f770911a1a9))

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
