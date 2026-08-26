# Инвентарь артефактов под починку §7 (снято 2026-08-26)

Способ: grep -rn по монорепо (--include ts/json/md), исключены node_modules, dist,
coverage, .turbo, .claude/worktrees, yandex_tracker_client, .agentic-planning, сервер wiki.
Чего способ не видит: идентификаторы, собираемые конкатенацией; ключи из JSON-фикстур;
ссылки из manifest.json, если имя там пишется иначе; генерируемые из Zod definition-файлы.

## /country/
```
CHANGELOG.md:48:query, useRanking, country — этих полей нет у POST /v3/liveBoards.
packages/servers/yandex-tracker/doc-route-sweep.md:30:| `fr_yandex_tracker_update_board` | PATCH `/v3/boards/probe_boardId` | orderBy, orderAsc, useRanking, country | api-ref/boards/patch-board |
packages/servers/yandex-tracker/doc-route-sweep.md:69:- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект
packages/servers/yandex-tracker/doc-route-sweep.md:75:- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект
packages/servers/yandex-tracker/doc-route-sweep.md:81:- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект
packages/servers/yandex-tracker/doc-route-sweep.md:87:- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране. Объект
packages/servers/yandex-tracker/doc-route-sweep.md:94:- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране. Объект
packages/servers/yandex-tracker/outgoing-requests.md:58:| `fr_yandex_tracker_update_board` | нет | нет | PATCH | `/v3/boards/probe_boardId` | name, columns, filter, orderBy, orderAsc, query, useRanking, country |
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:69:  'country',
packages/servers/yandex-tracker/src/tools/api/boards/update-board.metadata.ts:22:  redactionAllowlist: ['boardId', 'version', 'orderAsc', 'useRanking', 'country', 'fields'],
packages/servers/yandex-tracker/src/tools/api/boards/update-board.schema.ts:67:    country: z.string().optional(),
packages/servers/yandex-tracker/src/tracker_api/dto/board/update-board.dto.ts:41:  country?: string | undefined;
packages/servers/yandex-tracker/src/tracker_api/entities/board.entity.ts:131:  readonly country?: CountryRef;
```

## /startDateTime|endDateTime/
```
packages/servers/yandex-tracker/doc-route-sweep.md:31:| `fr_yandex_tracker_create_sprint` | POST `/v3/sprints` | startDateTime, endDateTime, status | api-ref/boards/post-sprint |
packages/servers/yandex-tracker/doc-route-sweep.md:32:| `fr_yandex_tracker_update_sprint` | PATCH `/v3/sprints/probe_sprintId` | startDateTime, endDateTime | api-ref/boards/patch-sprint |
packages/servers/yandex-tracker/outgoing-requests.md:62:| `fr_yandex_tracker_create_sprint` | нет | нет | POST | `/v3/sprints` | name, board, startDate, endDate, startDateTime, endDateTime, status |
packages/servers/yandex-tracker/outgoing-requests.md:63:| `fr_yandex_tracker_update_sprint` | нет | нет | PATCH | `/v3/sprints/probe_sprintId` | name, version, startDate, endDate, startDateTime, endDateTime, status |
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:89:  'startDateTime',
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:90:  'endDateTime',
packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.metadata.ts:23:    'startDateTime',
packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.metadata.ts:24:    'endDateTime',
packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.schema.ts:32:  startDateTime: z.string().optional(),
packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.schema.ts:35:  endDateTime: z.string().optional(),
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:24:    'startDateTime',
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:25:    'endDateTime',
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:40:  startDateTime: z.string().optional(),
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:43:  endDateTime: z.string().optional(),
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/create-sprint.dto.ts:21:  startDateTime?: string | undefined;
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/create-sprint.dto.ts:24:  endDateTime?: string | undefined;
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/update-sprint.dto.ts:24:  startDateTime?: string | undefined;
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/update-sprint.dto.ts:27:  endDateTime?: string | undefined;
packages/servers/yandex-tracker/src/tracker_api/entities/sprint.entity.ts:86:  readonly startDateTime?: string;
packages/servers/yandex-tracker/src/tracker_api/entities/sprint.entity.ts:89:  readonly endDateTime?: string;
```

## /manage_queue_access|ManageQueueAccess|manage-queue-access/
```
packages/framework/dev-client/docs/tools-annotations-inventory.md:181:| yandex-tracker | manage_queue_access | false | false | true | true | manage-queue-access.metadata.ts |
packages/servers/yandex-tracker/README.md:268:- `fr_yandex_tracker_manage_queue_access` — Управление доступом к очереди
packages/servers/yandex-tracker/doc-route-sweep.md:28:| `fr_yandex_tracker_manage_queue_access` | PATCH `/v3/queues/probe_queueId/permissions` | queue-lead | api-ref/queues/manage-access |
packages/servers/yandex-tracker/outgoing-requests.md:31:| `fr_yandex_tracker_manage_queue_access` | нет | нет | PATCH | `/v3/queues/probe_queueId/permissions` | queue-lead |
packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts:148:  ManageQueueAccessOperation,
packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts:26:  ManageQueueAccessOperation,
packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts:143:  ManageQueueAccessTool,
packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts:25:  ManageQueueAccessTool,
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:140:/** Роли и действия правки доступов очереди — из схемы `manage_queue_access`. */
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:207: * (`manage-queue-access.operation.ts`). Каждый субъект — реальный логин, поэтому
packages/servers/yandex-tracker/src/tools/api/queues/index.ts:11:export { ManageQueueAccessTool } from './manage-queue-access.tool.js';
packages/servers/yandex-tracker/src/tools/api/queues/index.ts:19:export type { ManageQueueAccessParams } from './manage-queue-access.schema.js';
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.metadata.ts:14:import { ManageQueueAccessOutputSchema } from './manage-queue-access.schema.js';
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.metadata.ts:17: * Статические метаданные для ManageQueueAccessTool
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.metadata.ts:20:  name: buildToolName('manage_queue_access', MCP_TOOL_PREFIX),
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.metadata.ts:2: * Метаданные для ManageQueueAccessTool
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.metadata.ts:30:  outputSchema: ManageQueueAccessOutputSchema,
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:11:export const ManageQueueAccessParamsSchema = z.object({
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:2: * Zod схема для валидации параметров ManageQueueAccessTool
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:41:export type ManageQueueAccessParams = z.infer<typeof ManageQueueAccessParamsSchema>;
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:46:export const ManageQueueAccessOutputDataSchema = z.object({
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:57:export const ManageQueueAccessOutputSchema = buildOutputSchema(ManageQueueAccessOutputDataSchema);
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:11:import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from './manage-queue-access.metadata.js';
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:13:export class ManageQueueAccessTool extends BaseTool<YandexTrackerFacade> {
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:16:  protected override getParamsSchema(): typeof ManageQueueAccessParamsSchema {
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:17:    return ManageQueueAccessParamsSchema;
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:20:    const validation = this.validateParams(params, ManageQueueAccessParamsSchema);
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.tool.ts:8:import { ManageQueueAccessParamsSchema } from './manage-queue-access.schema.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md:452:### 6. ManageQueueAccessOperation
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/index.ts:11:  ManageQueueAccessOperation,
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/index.ts:12:  type ManageQueueAccessParams,
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/index.ts:13:} from './manage-queue-access.operation.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/manage-queue-access.operation.ts:13:import type { ManageQueueAccessDto, QueuePermissionsOutput } from '#tracker_api/dto/index.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/manage-queue-access.operation.ts:15:export interface ManageQueueAccessParams {
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/manage-queue-access.operation.ts:17:  accessData: ManageQueueAccessDto;
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/manage-queue-access.operation.ts:20:export class ManageQueueAccessOperation extends BaseOperation {
packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/manage-queue-access.operation.ts:32:  async execute(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
packages/servers/yandex-tracker/src/tracker_api/dto/index.ts:25:  ManageQueueAccessDto,
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:109: * Создает валидный ManageQueueAccessDto для удаления пользователей
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:112:  overrides?: Partial<ManageQueueAccessDto>
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:113:): ManageQueueAccessDto {
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:13:import type { ManageQueueAccessDto } from './manage-queue-access.dto.js';
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:95: * Создает валидный ManageQueueAccessDto для добавления пользователей
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:98:  overrides?: Partial<ManageQueueAccessDto>
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:99:): ManageQueueAccessDto {
packages/servers/yandex-tracker/src/tracker_api/dto/queue/index.ts:11:export type { ManageQueueAccessDto, AccessAction } from './manage-queue-access.dto.js';
packages/servers/yandex-tracker/src/tracker_api/dto/queue/manage-queue-access.dto.ts:15:export interface ManageQueueAccessDto {
packages/servers/yandex-tracker/src/tracker_api/dto/queue/queue-permissions.output.ts:4: * ВАЖНО: Используется как возвращаемый тип из ManageQueueAccessOperation.
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/manage-sprint-lifecycle.dto.ts:7: * MCP-инструмент с параметром `action` (аналог `manage_queue_access`).
packages/servers/yandex-tracker/src/tracker_api/facade/services/containers/queue-operations.container.ts:16:import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
packages/servers/yandex-tracker/src/tracker_api/facade/services/containers/queue-operations.container.ts:26:    @inject(ManageQueueAccessOperation) readonly manageQueueAccess: ManageQueueAccessOperation
packages/servers/yandex-tracker/src/tracker_api/facade/services/queue.service.ts:34:  ManageQueueAccessParams,
packages/servers/yandex-tracker/src/tracker_api/facade/services/queue.service.ts:91:  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
packages/servers/yandex-tracker/src/tracker_api/facade/yandex-tracker.facade.ts:137:  ManageQueueAccessParams,
packages/servers/yandex-tracker/src/tracker_api/facade/yandex-tracker.facade.ts:316:  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
packages/servers/yandex-tracker/tests/COVERAGE_MATRIX.md:148:| `manage_queue_access` | api/queues | да |  | unit: tests/smoke (общий набор, definition-generation.smoke.test.ts) | мок (устаревшая оснастка): tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts | мок (устаревшая оснастка): tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts | мок (устаревшая оснастка): tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts | исключение: tests/TESTING_STRATEGY.md §1 — вне очереди TEST, живьём не наблюдается никогда | мок (устаревшая оснастка): tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts | не наблюдалось |
packages/servers/yandex-tracker/tests/coverage-exceptions/legacy-mock-tests.ts:72:  'tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts',
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:109: * Создать ManageQueueAccessDto для добавления прав доступа
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:113: * const dto = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:120:export function createManageQueueAccessDto(
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:121:  overrides?: Partial<ManageQueueAccessDto>
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:122:): ManageQueueAccessDto {
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:132: * Создать ManageQueueAccessDto для удаления прав доступа
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:13:  ManageQueueAccessDto,
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:140:  role: ManageQueueAccessDto['role'],
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:142:): ManageQueueAccessDto {
packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1252:  mockManageQueueAccessSuccess(queueKey: string): this {
packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1276:  mockManageQueueAccess403(queueKey: string): this {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:118:      mockServer.mockManageQueueAccess403(queueKey);
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:121:      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:13:describe('manage-queue-access integration tests', () => {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:2: * Интеграционные тесты для manage-queue-access tool
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:30:      mockServer.mockManageQueueAccessSuccess(queueKey);
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:33:      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:53:      mockServer.mockManageQueueAccessSuccess(queueKey);
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:56:      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:74:      mockServer.mockManageQueueAccessSuccess(queueKey);
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:77:      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:95:      mockServer.mockManageQueueAccessSuccess(queueKey);
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:98:      const result = await client.callTool('fr_yandex_tracker_manage_queue_access', {
packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:241:    tool: 'manage_queue_access',
packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:250:    tool: 'manage_queue_access (чужая очередь)',
packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:138:    // Форма тела — та, что строит ManageQueueAccessOperation.
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:14:describe('ManageQueueAccessTool', () => {
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:17:  let tool: ManageQueueAccessTool;
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:2: * Unit тесты для ManageQueueAccessTool
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:31:    tool = new ManageQueueAccessTool(mockTrackerFacade, mockLogger);
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:38:      expect(definition.name).toBe(buildToolName('manage_queue_access', MCP_TOOL_PREFIX));
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:6:import { ManageQueueAccessTool } from '#tools/api/queues/manage-queue-access.tool.js';
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:102:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:121:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:13:describe('ManageQueueAccessOperation', () => {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:140:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:14:  let operation: ManageQueueAccessOperation;
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:159:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:178:      const accessData = createManageQueueAccessDto();
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:188:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:224:      const accessData = createManageQueueAccessDto();
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:238:      const accessData = createManageQueueAccessDto();
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:44:    operation = new ManageQueueAccessOperation(mockHttpClient, mockCacheManager, mockLogger);
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:49:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:6:import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:83:      const accessData = createManageQueueAccessDto({
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:9:  createManageQueueAccessDto,
packages/servers/yandex-tracker/tests/tracker_api/facade/services/queue.service.test.ts:207:      const params: ManageQueueAccessParams = {
packages/servers/yandex-tracker/tests/tracker_api/facade/services/queue.service.test.ts:39:  ManageQueueAccessParams,
```

## /UpdateSprint|update-sprint|update_sprint/
```
packages/framework/dev-client/docs/tools-annotations-inventory.md:188:| yandex-tracker | update_sprint | false | false | true | true | update-sprint.metadata.ts |
packages/servers/yandex-tracker/doc-route-sweep.md:32:| `fr_yandex_tracker_update_sprint` | PATCH `/v3/sprints/probe_sprintId` | startDateTime, endDateTime | api-ref/boards/patch-sprint |
packages/servers/yandex-tracker/outgoing-requests.md:63:| `fr_yandex_tracker_update_sprint` | нет | нет | PATCH | `/v3/sprints/probe_sprintId` | name, version, startDate, endDate, startDateTime, endDateTime, status |
packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts:188:  UpdateSprintOperation,
packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts:86:  UpdateSprintOperation,
packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts:187:  UpdateSprintTool,
packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts:80:  UpdateSprintTool,
packages/servers/yandex-tracker/src/tools/api/sprints/index.ts:18:export { UpdateSprintTool } from './update-sprint.tool.js';
packages/servers/yandex-tracker/src/tools/api/sprints/index.ts:19:export { UpdateSprintParamsSchema, type UpdateSprintParams } from './update-sprint.schema.js';
packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.schema.ts:7: * manage-sprint-lifecycle.dto.js`). Для name/dates/status — `update_sprint`.
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:11:  name: buildToolName('update_sprint', MCP_TOOL_PREFIX),
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:2: * Метаданные для UpdateSprintTool
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:30:  outputSchema: UpdateSprintOutputSchema,
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.metadata.ts:8:import { UpdateSprintOutputSchema } from './update-sprint.schema.js';
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:23:export const UpdateSprintParamsSchema = z.object({
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:2: * Zod схема для валидации параметров UpdateSprintTool
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:52:export type UpdateSprintParams = z.infer<typeof UpdateSprintParamsSchema>;
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:54:export const UpdateSprintOutputDataSchema = z.object({
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts:58:export const UpdateSprintOutputSchema = buildOutputSchema(UpdateSprintOutputDataSchema);
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:11:import { UPDATE_SPRINT_TOOL_METADATA } from './update-sprint.metadata.js';
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:13:export class UpdateSprintTool extends BaseTool<YandexTrackerFacade> {
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:16:  protected override getParamsSchema(): typeof UpdateSprintParamsSchema {
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:17:    return UpdateSprintParamsSchema;
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:21:    const validation = this.validateParams(params, UpdateSprintParamsSchema);
packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:9:import { UpdateSprintParamsSchema } from './update-sprint.schema.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/index.ts:8:export { UpdateSprintOperation } from './update-sprint.operation.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts:6: *   (для этого — `UpdateSprintOperation`/`update_sprint`)
packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/update-sprint.operation.ts:14:import type { UpdateSprintDto, SprintOutput } from '#tracker_api/dto/index.js';
packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/update-sprint.operation.ts:16:export class UpdateSprintOperation extends BaseOperation {
packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/update-sprint.operation.ts:28:  async execute(dto: UpdateSprintDto): Promise<SprintOutput> {
packages/servers/yandex-tracker/src/tracker_api/dto/index.ts:113:  UpdateSprintDto,
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/index.ts:9:export type { UpdateSprintDto } from './update-sprint.dto.js';
packages/servers/yandex-tracker/src/tracker_api/dto/sprint/update-sprint.dto.ts:7:export interface UpdateSprintDto {
packages/servers/yandex-tracker/src/tracker_api/facade/services/sprint.service.ts:24:import { UpdateSprintOperation } from '#tracker_api/api_operations/sprint/update-sprint.operation.js';
packages/servers/yandex-tracker/src/tracker_api/facade/services/sprint.service.ts:28:  UpdateSprintDto,
packages/servers/yandex-tracker/src/tracker_api/facade/services/sprint.service.ts:43:    @inject(UpdateSprintOperation)
packages/servers/yandex-tracker/src/tracker_api/facade/services/sprint.service.ts:44:    private readonly updateSprintOp: UpdateSprintOperation,
packages/servers/yandex-tracker/src/tracker_api/facade/services/sprint.service.ts:84:    input: Omit<UpdateSprintDto, 'sprintId'>
packages/servers/yandex-tracker/src/tracker_api/facade/yandex-tracker.facade.ts:1032:    input: Omit<UpdateSprintDto, 'sprintId'>
packages/servers/yandex-tracker/src/tracker_api/facade/yandex-tracker.facade.ts:82:  UpdateSprintDto,
packages/servers/yandex-tracker/tests/COVERAGE_MATRIX.md:155:| `update_sprint` | api/sprints | да |  | unit: tests/smoke (общий набор, definition-generation.smoke.test.ts) | мок: tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts | мок: tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts | мок (гипотеза): tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts | исключение: tests/TESTING_STRATEGY.md §1 — вне очереди TEST, живьём не наблюдается никогда | мок: tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts | не наблюдалось |
packages/servers/yandex-tracker/tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts:14:import { UPDATE_SPRINT_TOOL_METADATA } from '#tools/api/sprints/update-sprint.metadata.js';
packages/servers/yandex-tracker/tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts:15:import { UpdateSprintOutputDataSchema } from '#tools/api/sprints/update-sprint.schema.js';
packages/servers/yandex-tracker/tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts:36:    outputDataSchema: UpdateSprintOutputDataSchema,
packages/servers/yandex-tracker/tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts:43:    // `sprintId` не может быть пустым (UpdateSprintParamsSchema, min(1)).
packages/servers/yandex-tracker/tests/integration/tools/api/sprints/update-sprint.tool.integration.test.ts:66:  // update_sprint — единичная операция без batch-режима.
packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:380:    tool: 'update_sprint',
packages/servers/yandex-tracker/tests/tools/api/sprints/update-sprint.tool.test.ts:10:describe('UpdateSprintTool', () => {
packages/servers/yandex-tracker/tests/tools/api/sprints/update-sprint.tool.test.ts:13:  let tool: UpdateSprintTool;
packages/servers/yandex-tracker/tests/tools/api/sprints/update-sprint.tool.test.ts:23:    tool = new UpdateSprintTool(mockTrackerFacade, mockLogger);
packages/servers/yandex-tracker/tests/tools/api/sprints/update-sprint.tool.test.ts:2: * Unit тесты для UpdateSprintTool
packages/servers/yandex-tracker/tests/tools/api/sprints/update-sprint.tool.test.ts:6:import { UpdateSprintTool } from '#tools/api/sprints/update-sprint.tool.js';
```

## /queue-lead|team-member/
```
packages/servers/yandex-tracker/doc-route-sweep.md:28:| `fr_yandex_tracker_manage_queue_access` | PATCH `/v3/queues/probe_queueId/permissions` | queue-lead | api-ref/queues/manage-access |
packages/servers/yandex-tracker/outgoing-requests.md:31:| `fr_yandex_tracker_manage_queue_access` | нет | нет | PATCH | `/v3/queues/probe_queueId/permissions` | queue-lead |
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:142:  'queue-lead',
packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:143:  'team-member',
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:20:  role: z.enum(['queue-lead', 'team-member', 'follower', 'access']),
packages/servers/yandex-tracker/src/tools/api/queues/manage-queue-access.schema.ts:48:  role: z.enum(['queue-lead', 'team-member', 'follower', 'access']),
packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md:456:- Роли: queue-lead, team-member, follower, access
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:101:    role: 'team-member',
packages/servers/yandex-tracker/src/tracker_api/dto/queue/dto.factories.ts:115:    role: 'team-member',
packages/servers/yandex-tracker/src/tracker_api/entities/README.md:435:export type QueueRole = 'queue-lead' | 'team-member' | 'follower' | 'access';
packages/servers/yandex-tracker/src/tracker_api/entities/README.md:440:- `queue-lead` — руководитель очереди (полные права)
packages/servers/yandex-tracker/src/tracker_api/entities/README.md:441:- `team-member` — член команды (создание/редактирование задач)
packages/servers/yandex-tracker/src/tracker_api/entities/queue-permission.entity.ts:14:export type QueueRole = 'queue-lead' | 'team-member' | 'follower' | 'access';
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:115: *   role: 'team-member',
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:125:    role: 'team-member',
packages/servers/yandex-tracker/tests/helpers/queue-dto.fixture.ts:136: * const dto = createRemoveQueueAccessDto('team-member', ['user-123']);
packages/servers/yandex-tracker/tests/helpers/queue-permission.fixture.ts:114:    'queue-lead': [
packages/servers/yandex-tracker/tests/helpers/queue-permission.fixture.ts:120:    'team-member': [
packages/servers/yandex-tracker/tests/helpers/queue-permission.fixture.ts:70: * const leadPermission = createQueuePermissionForRole('queue-lead', {
packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:81:        role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:113:        const roles = ['queue-lead', 'team-member', 'follower', 'access'] as const;
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:131:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:149:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:166:      it('должен добавить одного пользователя в роль team-member', async () => {
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:172:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:182:            role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:189:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:210:        expect(parsed.data.role).toBe('team-member');
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:221:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:231:            role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:238:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:281:      it('должен добавить пользователя в роль queue-lead', async () => {
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:287:          role: 'queue-lead',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:297:            role: 'queue-lead',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:333:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:358:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:381:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:402:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:423:          role: 'team-member',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:438:      it('должен обработать ошибку "попытка удалить последнего queue-lead"', async () => {
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:444:          role: 'queue-lead',
packages/servers/yandex-tracker/tests/tools/api/queues/manage-queue-access.tool.test.ts:76:          role: 'team-member',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:101:    it('should support team-member role', async () => {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:104:        role: 'team-member',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:114:        'team-member': {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:161:        role: 'team-member',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:171:        'team-member': {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:190:        role: 'team-member',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:200:        'Добавление пользователей user-1, user-2 в роли team-member для очереди PROJ'
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:51:        role: 'team-member',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:61:        'team-member': {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:82:    it('should support queue-lead role', async () => {
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:85:        role: 'queue-lead',
packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts:95:        'queue-lead': {
```

