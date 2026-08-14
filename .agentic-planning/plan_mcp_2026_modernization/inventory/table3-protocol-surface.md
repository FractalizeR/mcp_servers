# Таблица 3. Протокольная поверхность (файлы, формирующие MCP-ответы)

Чем получено: grep по setRequestHandler|protocolVersion|StdioServerTransport|new Server( по packages/*/*/src.
Каналы: прямой импорт SDK, регистрация хендлеров, хардкод версии. НЕ покрыто: поведение, реализованное внутри самого SDK (ping, notifications/initialized) — оно не в нашем коде.

  packages/servers/ticktick/src/server.ts:14:import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  packages/servers/ticktick/src/server.ts:53:  server.setRequestHandler(InitializeRequestSchema, (request) => {
  packages/servers/ticktick/src/server.ts:63:      protocolVersion: '2025-06-18',
  packages/servers/ticktick/src/server.ts:75:  server.setRequestHandler(ListToolsRequestSchema, () => {
  packages/servers/ticktick/src/server.ts:99:  server.setRequestHandler(CallToolRequestSchema, async (request) => {
  packages/servers/ticktick/src/server.ts:220:    const server = new Server(
  packages/servers/ticktick/src/server.ts:239:    const transport = new StdioServerTransport();
  packages/servers/yandex-tracker/src/server.ts:14:import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  packages/servers/yandex-tracker/src/server.ts:52:  server.setRequestHandler(InitializeRequestSchema, (request) => {
  packages/servers/yandex-tracker/src/server.ts:62:      protocolVersion: '2025-06-18',
  packages/servers/yandex-tracker/src/server.ts:74:  server.setRequestHandler(ListToolsRequestSchema, () => {
  packages/servers/yandex-tracker/src/server.ts:98:  server.setRequestHandler(CallToolRequestSchema, async (request) => {
  packages/servers/yandex-tracker/src/server.ts:222:    const server = new Server(
  packages/servers/yandex-tracker/src/server.ts:241:    const transport = new StdioServerTransport();
  packages/servers/yandex-wiki/src/server.ts:14:import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  packages/servers/yandex-wiki/src/server.ts:52:  server.setRequestHandler(InitializeRequestSchema, (request) => {
  packages/servers/yandex-wiki/src/server.ts:62:      protocolVersion: '2025-06-18',
  packages/servers/yandex-wiki/src/server.ts:74:  server.setRequestHandler(ListToolsRequestSchema, () => {
  packages/servers/yandex-wiki/src/server.ts:98:  server.setRequestHandler(CallToolRequestSchema, async (request) => {
  packages/servers/yandex-wiki/src/server.ts:220:    const server = new Server(
  packages/servers/yandex-wiki/src/server.ts:239:    const transport = new StdioServerTransport();

## Файлы-хендлеры (вспомогательные)
packages/servers/ticktick/src/server/handlers.ts
packages/servers/yandex-tracker/src/server/handlers.ts
packages/servers/yandex-wiki/src/server/handlers.ts
