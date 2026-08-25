# Перечисление затронутых артефактов (снято 2026-08-25)

Чем получено: grep -rn по строковым литералам маршрутов и по именам символов в packages/, docs, tests (исключены node_modules, dist, .turbo).
Чего способ не видит: динамически собранные пути (шаблонные строки с переменной вместо литерала), ссылки из README на маршруты словами, JSON-фикстуры dev-client, регистрация в DI по строковому токену.

## literal: queues/${queueId}/components
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1346:    const mockKey = `GET /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1347:    const urlPattern = new RegExp(`^/v3/queues/${queueId}/components(\\?.*)?$`);
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1363:    const mockKey = `GET /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1364:    const urlPattern = new RegExp(`^/v3/queues/${queueId}/components(\\?.*)?$`);
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1381:    const mockKey = `GET /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1382:    this.mockAdapter.onGet(`/v3/queues/${queueId}/components`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1403:    const mockKey = `POST /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1404:    this.mockAdapter.onPost(`/v3/queues/${queueId}/components`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1420:    const mockKey = `POST /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1421:    this.mockAdapter.onPost(`/v3/queues/${queueId}/components`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1437:    const mockKey = `POST /v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1438:    this.mockAdapter.onPost(`/v3/queues/${queueId}/components`).reply(() => {
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/get-components.operation.ts:59:    const path = `/v3/queues/${queueId}/components`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/create-component.operation.ts:58:      `/v3/queues/${queueId}/components`,

## literal: /v3/components
  packages/servers/yandex-tracker/tests/integration/templates/component.json:3:  "self": "https://api.tracker.yandex.net/v3/components/1",
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1456:    const mockKey = `PATCH /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1457:    this.mockAdapter.onPatch(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1473:    const mockKey = `PATCH /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1474:    this.mockAdapter.onPatch(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1496:    const getMockKey = `GET /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1497:    this.mockAdapter.onGet(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1507:    const deleteMockKey = `DELETE /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1508:    this.mockAdapter.onDelete(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1525:    const mockKey = `GET /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1526:    this.mockAdapter.onGet(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1536:    const deleteMockKey = `DELETE /v3/components/${componentId}`;
  packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1537:    this.mockAdapter.onDelete(`/v3/components/${componentId}`).reply(() => {
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:190:    path: `/v3/components/${SANDBOX_COMPONENT}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:196:    path: `/v3/components/${SANDBOX_COMPONENT}`,
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:81:      `/v3/components/${SANDBOX_COMPONENT}`,
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:96:      guard.inspectRequest({ method: 'delete', url: '/v3/components/557', data: undefined })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:110:      guard.inspectRequest({ method: 'delete', url: '/v3/components/556', data: undefined })
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:272:    ['delete', `/v3/components/${SANDBOX_COMPONENT}/extra`],
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:140:      const decision = decide('delete', '/v3/components/foreign-component');
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:219:      const decision = decide('patch', `/v3/components/${SANDBOX_COMPONENT}`);
  packages/servers/yandex-tracker/tests/helpers/component.fixture.ts:42:    self: `https://api.tracker.yandex.net/v3/components/${id}`,
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/update-component.operation.test.ts:57:      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/components/1', updates);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/update-component.operation.test.ts:99:      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/components/1', updates);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/update-component.operation.test.ts:217:      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/components/1', {});
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/delete-component.operation.test.ts:57:      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/components/1');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/delete-component.operation.test.ts:58:      expect(deleteSpy).toHaveBeenCalledWith('/v3/components/1');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/delete-component.operation.test.ts:95:      expect(deleteSpy).toHaveBeenCalledWith('/v3/components/1');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/delete-component.operation.test.ts:175:      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/components/123');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/component/delete-component.operation.test.ts:176:      expect(deleteSpy).toHaveBeenCalledWith('/v3/components/123');
  packages/servers/yandex-tracker/src/live_scope/request-path.ts:5: * интерцептора: `/v3/components/{id}/../../projects/1` доходит до правил как путь
  packages/servers/yandex-tracker/src/live_scope/run-journal.ts:5: * идентификатором (`DELETE /v3/components/{id}`), по которому принадлежность
  packages/servers/yandex-tracker/src/tracker_api/dto/component/component.output.ts:6: * - PATCH /v3/components/{componentId} (обновление)
  packages/servers/yandex-tracker/src/tracker_api/dto/component/update-component.dto.ts:4: * API: PATCH /v3/components/{componentId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md:480:`PATCH /v3/components/{componentId}` — обновление параметров, инвалидация кеша
  packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md:483:`DELETE /v3/components/{componentId}` — удаление, сначала GET для queueId
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/delete-component.operation.ts:9: * API: DELETE /v3/components/{componentId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/delete-component.operation.ts:47:      const component = await this.httpClient.get<ComponentOutput>(`/v3/components/${componentId}`);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/delete-component.operation.ts:56:    await this.deleteRequest<void>(`/v3/components/${componentId}`);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/update-component.operation.ts:9: * API: PATCH /v3/components/{componentId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/component/update-component.operation.ts:50:      `/v3/components/${componentId}`,
  packages/servers/yandex-tracker/src/tracker_api/entities/component.entity.ts:7: * - PATCH /v3/components/{componentId} - обновление компонента
  packages/servers/yandex-tracker/src/tracker_api/entities/component.entity.ts:8: * - DELETE /v3/components/{componentId} - удаление компонента
  packages/servers/yandex-tracker/src/tracker_api/entities/component.entity.ts:30:   * Число, а не строка: живой GET `/v3/components` 2026-08-19 отдаёт `4`, `5`, `16`.
  packages/servers/yandex-tracker/src/tracker_api/entities/component.entity.ts:37:   * @example "https://api.tracker.yandex.net/v3/components/1"

## literal: /v3/boards
  packages/servers/yandex-tracker/CLAUDE.md:79:| Boards | v3 | `/v3/boards` |
  packages/servers/yandex-tracker/CLAUDE.md:80:| Board columns | v3 | `/v3/boards/{id}/columns/` |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:164:| доски | `GET /v3/boards` | `GET /v2/boards` | страница списка досок, 2026-08-23 |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:175:| доски | `/v2/boards`, но `/v3/boards/{id}/columns` | доска и её колонки в разных версиях |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:176:| колонки досок | `POST /v3/boards/{id}/columns/` со слэшом, тогда как `update`/`delete`/`get` колонок — без | слэш только у создания; источником не подтверждён |
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:5: * Пакет `sprints` этапа 4.1 перевёл операцию на `GET /v3/boards/{id}/sprints` —
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:27:  expectedRequests: [{ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:33:        .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:63:          .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:69:      // Единственный HTTP-вызов get_sprints — GET /v3/boards/{id}/sprints; 404
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:73:          .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:91:        .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/sprints/get-sprints.tool.integration.test.ts:104:      .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:9: * реально ходит в `/v3/boards/{boardId}`.
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:29:  expectedRequests: [{ method: 'get', path: '/v3/boards/42', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:35:        .expectRequest({ method: 'get', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:53:          .expectRequest({ method: 'get', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:60:      // конкретный путь `/v3/boards/42` один раз (H-1).
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:63:          .expectRequest({ method: 'get', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:79:        .expectRequest({ method: 'get', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board.tool.integration.test.ts:97:        path: '/v3/boards/42',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:32:  expectedRequests: [{ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:38:        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:64:          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:74:          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:91:        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:104:      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:142:      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-board-columns.tool.integration.test.ts:144:        link: '<https://api.tracker.yandex.net/v3/boards/42/columns?page=2>; rel="next"',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board-column.tool.integration.test.ts:23:  expectedRequests: [{ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board-column.tool.integration.test.ts:31:          path: '/v3/boards/42/columns/7',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board-column.tool.integration.test.ts:52:          .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board-column.tool.integration.test.ts:62:          .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board-column.tool.integration.test.ts:78:        .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:7: * (`/v3/boards/{boardId}/columns/`) наблюдается в `create-board-column.operation.ts`
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:26:  expectedRequests: [{ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:34:          path: '/v3/boards/42/columns/',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:56:          .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:67:          .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board-column.tool.integration.test.ts:83:        .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:9: * её не различает); сервер реально ходит в `/v3/boards`.
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:30:  expectedRequests: [{ method: 'get', path: '/v3/boards', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:36:        .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:61:          .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:67:      // Единственный HTTP-вызов get_boards — GET /v3/boards; 404 — гипотетическая
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:73:          .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:90:        .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:102:    ctx.api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/get-boards.tool.integration.test.ts:123:        path: '/v3/boards',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:22:  expectedRequests: [{ method: 'post', path: '/v3/boards', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:30:          path: '/v3/boards',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:52:          .expectRequest({ method: 'post', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:58:      // Единственный HTTP-вызов create_board — POST /v3/boards; 404 здесь — та же
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:62:          .expectRequest({ method: 'post', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/create-board.tool.integration.test.ts:80:        .expectRequest({ method: 'post', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:9: * её не различает); сервер реально ходит в `/v3/boards/{boardId}`.
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:25:  expectedRequests: [{ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:33:          path: '/v3/boards/42',
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:54:          .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:61:      // конкретный путь `/v3/boards/42` один раз (H-1).
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:64:          .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/update-board.tool.integration.test.ts:80:        .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:9: * реально ходит в `/v3/boards/{id}`, см. отчёт пакета P1.
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:24:  expectedRequests: [{ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:29:      api.expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' }).reply(200);
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:47:          .expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:54:      // конкретный путь `/v3/boards/42` один раз (H-1); 404 здесь — та же операция,
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board.tool.integration.test.ts:58:          .expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board-column.tool.integration.test.ts:24:  expectedRequests: [{ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board-column.tool.integration.test.ts:30:        .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board-column.tool.integration.test.ts:49:          .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/boards/delete-board-column.tool.integration.test.ts:59:          .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.ts:69:   * Относительный путь запроса, ВКЛЮЧАЯ версию (например, `/v3/boards`,
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:41:    await expect(client.getAxiosInstance().get('/v3/boards')).rejects.toThrow(
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:47:    api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:54:      api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v2' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:59:    api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:60:    api.expectRequest({ method: 'get', path: '/v3/boards/1', apiVersion: 'v3' }).reply(200, {});
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:62:    await expect(client.getAxiosInstance().get('/v3/boards/1')).rejects.toThrow(
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:68:    api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' });
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:70:    await expect(client.getAxiosInstance().get('/v3/boards')).rejects.toThrow(
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:77:      .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:80:      .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:83:    const first = await client.getAxiosInstance().get('/v3/boards');
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:84:    const second = await client.getAxiosInstance().get('/v3/boards');
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:93:      .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:94:      .reply(200, [], { Link: '<https://api.tracker.yandex.net/v3/boards?page=2>; rel="next"' });
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:96:    const response = await client.getAxiosInstance().get('/v3/boards');
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:106:    api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:109:      client.getAxiosInstance().get('/v3/boards', { params: { localized: false } })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:142:        path: '/v3/boards',
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:148:    await expect(client.getAxiosInstance().post('/v3/boards', { name: 'Actual' })).rejects.toThrow(
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:155:    ['доска', 'patch', `/v3/boards/${SANDBOX_BOARD}`, { orderBy: 'rank' }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:156:    ['колонка доски', 'patch', `/v3/boards/${SANDBOX_BOARD}/columns/c1`, { limit: 5 }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:179:    ['доска', 'patch', `/v3/boards/${SANDBOX_BOARD}`, { sprints: [1] }, 'sprints'],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:180:    ['колонка доски', 'patch', `/v3/boards/${SANDBOX_BOARD}/columns/c1`, { board: 'x' }, 'board'],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:346:    ['доска', `/v3/boards/${SANDBOX_BOARD}`, { name: 'renamed' }],
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:204:      request: { method: 'post', url: '/v3/boards', data: { name: 'run-1-board' } },
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:212:  it('колонка доски (подпуть /v3/boards/{b}/columns) родом board не регистрируется', () => {
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:218:      request: { method: 'post', url: '/v3/boards/20/columns', data: { name: 'col' } },
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:92:    const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, { queue: 'PROD' });
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:98:    const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, { queue: SANDBOX_QUEUE });
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:234:    const decision = decideIn(withUncreatedDisposableQueue(), 'post', '/v3/boards', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:274:    ['delete', `/v3/boards/${SANDBOX_BOARD}/columns/c1/extra`],
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:358:    path: '/v3/boards',
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:365:    path: `/v3/boards/${SANDBOX_BOARD}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:372:    path: `/v3/boards/${SANDBOX_BOARD}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:378:    path: `/v3/boards/${SANDBOX_BOARD}/columns/`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:385:    path: `/v3/boards/${SANDBOX_BOARD}/columns/c1`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:392:    path: `/v3/boards/${SANDBOX_BOARD}/columns/c1`,
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:242:      const decision = decide('post', '/v3/boards', { name: 'no-prefix-board' });
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:269:    const decision = decide('post', '/v3/boards/unknown-board/columns', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:365:    const decision = decide('post', '/v3/boards', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:448:      const decision = decide('post', '/v3/boards/unknown-board/columns', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:462:      const decision = decide('patch', `/v3/boards/${SANDBOX_BOARD}`, {
  packages/servers/yandex-tracker/tests/helpers/board-columns.fixture.ts:2: * Фикстура колонки доски (`GET/POST/PATCH /v3/boards/{boardId}/columns`).
  packages/servers/yandex-tracker/tests/helpers/board-columns.fixture.ts:11: * (`"self": "https://api.tracker.yandex.net/v3/boards/73/columns/5"`), а
  packages/servers/yandex-tracker/tests/helpers/board-columns.fixture.ts:17: * НЕ путать с `agile.fixture.ts` — там фикстуры Board и Sprint целиком (`/v3/boards`,
  packages/servers/yandex-tracker/tests/helpers/board-columns.fixture.ts:18: * `/v3/sprints`), здесь — только вложенная колонка доски (`/v3/boards/{id}/columns`).
  packages/servers/yandex-tracker/tests/helpers/board-columns.fixture.ts:29:    self: `https://api.tracker.yandex.net/v3/boards/1/columns/${String(id)}`,
  packages/servers/yandex-tracker/tests/helpers/agile.fixture.ts:10:    self: `https://api.tracker.yandex.net/v3/boards/${id}`,
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:789:            self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:807:            self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:826:          self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:843:          self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:861:          self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:880:          self: 'https://api.tracker.yandex.net/v3/boards/1',
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/board/create-board.operation.retry.test.ts:6: * `CreateBoardOperation` создаёт ресурс (POST /v3/boards) без ключа
  packages/servers/yandex-tracker/src/tracker_api/dto/board-column/board-column.dto.ts:4: * API: /v3/boards/{boardId}/columns
  packages/servers/yandex-tracker/src/tracker_api/dto/board-column/board-column.dto.ts:9: * а не как отдельный CRUD-эндпоинт `/v3/boards/{boardId}/columns`. Разные
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/delete-board.operation.ts:9: * API: DELETE /v3/boards/{boardId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/delete-board.operation.ts:35:    const endpoint = `/v3/boards/${boardId}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/get-boards.operation.ts:9: * API: GET /v3/boards
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/get-boards.operation.ts:39:    const endpoint = `/v3/boards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/update-board.operation.ts:9: * API: PATCH /v3/boards/{boardId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/update-board.operation.ts:33:    const endpoint = `/v3/boards/${boardId}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/get-board.operation.ts:9: * API: GET /v3/boards/{boardId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/get-board.operation.ts:48:      const endpoint = `/v3/boards/${boardId}${
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/create-board.operation.ts:9: * API: POST /v3/boards
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board/create-board.operation.ts:30:    const endpoint = '/v3/boards';
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/get-board-columns.operation.ts:4: * API: GET /v3/boards/{boardId}/columns (не пагинируется)
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/get-board-columns.operation.ts:20:      `/v3/boards/${boardId}/columns`
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/delete-board-column.operation.ts:4: * API: DELETE /v3/boards/{boardId}/columns/{columnId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/delete-board-column.operation.ts:15:    await this.httpClient.delete<void>(`/v3/boards/${boardId}/columns/${columnId}`);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/update-board-column.operation.ts:4: * API: PATCH /v3/boards/{boardId}/columns/{columnId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/update-board-column.operation.ts:24:      `/v3/boards/${boardId}/columns/${columnId}`,
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/create-board-column.operation.ts:4: * API: POST /v3/boards/{boardId}/columns/
  packages/servers/yandex-tracker/src/tracker_api/api_operations/board-column/create-board-column.operation.ts:17:    return this.httpClient.post<WithUnknownFields<BoardColumn>>(`/v3/boards/${boardId}/columns/`, {
  packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/get-sprints.operation.ts:8: * API: GET /v3/boards/{boardId}/sprints
  packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/get-sprints.operation.ts:35:    const endpoint = `/v3/boards/${boardId}/sprints`;
  packages/servers/yandex-tracker/src/tracker_api/entities/sprint.entity.ts:5: * Также: /v3/boards/{boardId}/sprints/
  packages/servers/yandex-tracker/src/tracker_api/entities/board.entity.ts:4: * Соответствует API v3: /v3/boards/{boardId}
  packages/servers/yandex-tracker/src/tracker_api/entities/board.entity.ts:64: * Обязательные поля (без ?) всегда присутствуют в ответе GET /v3/boards/{boardId}.

## literal: /v3/liveBoards

## literal: /v3/queues/'
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:225:    path: '/v3/queues/',
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:285:      request: { method: 'post', url: '/v3/queues/', data: { key: 'DISP', name: 'run-1-queue' } },
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/create-queue.operation.test.ts:56:      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/queues/', dto);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/queue/create-queue.operation.test.ts:165:      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/queues/', dto);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/queue/create-queue.operation.ts:41:    const createdQueue = await this.httpClient.post<QueueOutput>('/v3/queues/', queueData);

## literal: /v3/projects
  packages/servers/yandex-tracker/CLAUDE.md:77:| Projects | v3 | `/v3/projects` |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:161:| проекты | `POST /v3/projects/` | `POST /v2/projects` | страница создания проекта, 2026-08-23 |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:168:`PUT /v3/projects/{id}?version=<version>` против нашего `PATCH` без `version`, и
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:179:| проекты | `/v2/projects` целиком | прочитано создание — оно v3; про `update` как `PUT /v3/projects/{id}?version=` сообщил пакет, лично не перепроверено |
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:3: * не смешивается с коллекцией проектов (`/v3/projects`, инструменты
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:10: * коллекции (`/v3/entities/` у Entity API, `/v3/projects` у legacy-проектов),
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:47:describe('Entity API vs коллекция /v3/projects — контракт разделения', () => {
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:48:  it('ни один инструмент Entity API не называется так же, как инструмент коллекции /v3/projects', () => {
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:69:          'отличающий Entity API от коллекции /v3/projects'
  packages/servers/yandex-tracker/tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts:74:  it('инструменты коллекции /v3/projects существуют и не претендуют быть Entity API', () => {
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:11: * `GET /v3/projects/<project_ID>` — версия v3. Референсный `yandex_tracker_client/`
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:14: * (`GetProjectOperation`: `GET /v3/projects/{projectId}`). Тест фиксирует
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:33:  expectedRequests: [{ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:43:          path: '/v3/projects/project123',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:64:          .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:72:          .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-project.tool.integration.test.ts:90:        .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:11: * снято `curl` 2026-08-23) описывает `DELETE /v3/projects/<project_ID>` — версия v3.
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:15: * `DELETE /v3/projects/{projectId}`). Тест фиксирует НАБЛЮДАЕМОЕ поведение кода (v3) —
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:32:  expectedRequests: [{ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:38:        .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:57:          .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/delete-project.tool.integration.test.ts:65:          .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:11: * `PUT /v3/projects/<project_ID>?version=<version>` — другой HTTP-метод (PUT, не
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:16: * (`UpdateProjectOperation`: `PATCH /v3/projects/{projectId}`, без `version`). Тест
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:35:  expectedRequests: [{ method: 'patch', path: '/v3/projects/project123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:43:          path: '/v3/projects/project123',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:64:          .expectRequest({ method: 'patch', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:72:          .expectRequest({ method: 'patch', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/update-project.tool.integration.test.ts:90:        .expectRequest({ method: 'patch', path: '/v3/projects/project123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:11: * `GET /v3/projects` — версия v3. Референсный `yandex_tracker_client/`
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:14: * (`GetProjectsOperation`: `GET /v3/projects`). Тест фиксирует НАБЛЮДАЕМОЕ
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:19: * /v3/projects` пагинируется через заголовок `Link` (`rel="next"`/`rel="seek"`),
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:42: * `rel="next"` + `rel="seek"` — семантика `/v3/projects` реальной API (см.
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:48:  '<https://api.tracker.yandex.net/v3/projects?perPage=2&page=2>; rel="next", ' +
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:49:  '<https://api.tracker.yandex.net/v3/projects?perPage=2{&page}>; rel="seek"';
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:54:  expectedRequests: [{ method: 'get', path: '/v3/projects', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:62:          path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:87:          .expectRequest({ method: 'get', path: '/v3/projects', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:93:      // Единственный HTTP-вызов get_projects — GET /v3/projects; 404 здесь — та же
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:99:            path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:120:            path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:136:            path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:150:        .expectRequest({ method: 'get', path: '/v3/projects', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/get-projects.tool.integration.test.ts:162:    ctx.api.expectRequest({ method: 'get', path: '/v3/projects', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:11: * `POST /v3/projects/` (с завершающим слэшом) — версия v3. Референсный
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:15: * `POST /v3/projects`). Тест фиксирует НАБЛЮДАЕМОЕ поведение кода (v3, без слэша) —
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:33:  expectedRequests: [{ method: 'post', path: '/v3/projects', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:41:          path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:63:          .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:69:      // Единственный HTTP-вызов create_project — POST /v3/projects; 404 здесь —
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:73:          .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/projects/create-project.tool.integration.test.ts:91:        .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:127:        path: '/v3/projects',
  packages/servers/yandex-tracker/tests/integration/helpers/api-expectation.test.ts:133:    const response = await client.getAxiosInstance().get('/v3/projects?perPage=10');
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:255:    path: '/v3/projects',
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:271:    path: `/v3/projects/${SANDBOX_PROJECT_ID}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:278:    path: `/v3/projects/${SANDBOX_PROJECT_ID}`,
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:42:      guard.inspectRequest({ method: 'delete', url: '/v3/projects/11', data: undefined })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:45:      guard.inspectRequest({ method: 'delete', url: '/v3/projects/11', data: undefined })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:191:      request: { method: 'post', url: '/v3/projects', data: { name: 'run-1-project' } },
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:435:        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:463:        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:475:        guard?.inspectRequest({ method: 'post', url: '/v3/projects', data: { name: 'x' } })
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:154:    ['проект', 'patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, { description: 'd' }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:175:      `/v3/projects/${SANDBOX_PROJECT_ID}`,
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:345:    ['проект', `/v3/projects/${SANDBOX_PROJECT_ID}`, { name: 'renamed' }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:363:    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:370:    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, { description: 'd' });
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:450:    '/v3/projects/%2e%2e',
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:151:      expect(decide('patch', '/v3/projects/11').allowed).toBe(false);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:200:      expect(decide('get', '/v3/projects/11').allowed).toBe(true);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:232:      const decision = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:261:    const decision = decide('patch', '/v3/projects/unknown-project', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:328:      const decision = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:338:      const decision = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:348:      const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:356:      const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:396:      expect(decide('post', '/v3/projects').allowed).toBe(false);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:400:      expect(decide('post', '/v3/projects', 'not-json-and-not-object').allowed).toBe(false);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:406:      expect(decide('post', '/v3/projects', form).allowed).toBe(false);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:413:      { method: 'post', url: '/v3/projects', data: { name: 'anything' } },
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:422:    expect(decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`).allowed).toBe(true);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:423:    expect(decide('patch', `/v3/projects/${SANDBOX_PROJECT_KEY}`).allowed).toBe(true);
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:109:    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:119:    const decision = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:130:    const decision = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:140:    const decision = decide('patch', `/v3/projects/${SANDBOX_PROJECT_ID}`, {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:202:    const decision = decideIn(noOwner, 'post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:223:    const decision = decideIn(withUncreatedDisposableQueue(), 'post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:252:    const project = decide('post', '/v3/projects', {
  packages/servers/yandex-tracker/tests/helpers/project.fixture.ts:45:    self: `https://api.tracker.yandex.net/v3/projects/${id}`,
  packages/servers/yandex-tracker/tests/helpers/project.fixture.ts:67:    self: `https://api.tracker.yandex.net/v3/projects/project-${key.toLowerCase()}`,
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/update-project.operation.test.ts:53:      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/projects/project123', updateDto);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/delete-project.operation.test.ts:48:      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/projects/project123');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/create-project.operation.test.ts:56:      expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/projects', inputDto);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:13:    const result = pinProjectsLinkHeader(headers, '/v3/projects?perPage=3&queueId=DVIZHDEV');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:15:    expect(result['link']).toContain('/v3/projects?');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:26:      '/v3/projects?perPage=3'
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:30:    expect(result['link']).toContain('/v3/projects');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:35:    // битый заголовок стал бы валидным `</v3/projects>` и зациклил fetchAll.
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:36:    const result = pinProjectsLinkHeader({ link: '<>; rel="next"' }, '/v3/projects?perPage=3');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:44:    expect(pinProjectsLinkHeader(headers, '/v3/projects')).toBe(headers);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/pin-projects-link.util.test.ts:48:    expect(isProjectsPath('/v3/projects?page=2')).toBe(true);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:10:const NEXT_LINK = '<https://api.tracker.yandex.net/v3/projects?perPage=100&page=2>; rel="next"';
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:13:  '<https://api.tracker.yandex.net/v3/projects?page=2>; rel="next", ' +
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:14:  '<https://api.tracker.yandex.net/v3/projects?{&page}>; rel="seek"';
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:15:const SEEK_ONLY_LINK = '<https://api.tracker.yandex.net/v3/projects?{&page}>; rel="seek"';
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:48:      httpClient.setResponse('GET', '/v3/projects', mockProjects);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:54:      expect(history[0]?.path).toBe('/v3/projects');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:58:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2));
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:70:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:83:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:95:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2));
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:103:      httpClient.setResponse('GET', '/v3/projects?perPage=100', createProjectListFixture(2));
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:107:      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?perPage=100');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:111:      httpClient.setResponse('GET', '/v3/projects?expand=queues', createProjectListFixture(1));
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:115:      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?expand=queues');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:119:      httpClient.setResponse('GET', '/v3/projects?queueId=QUEUE1', createProjectListFixture(1));
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:123:      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?queueId=QUEUE1');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:129:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:141:      expect(decoded.path).toBe('/v3/projects?page=2');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:145:      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:170:    // на /v2/queues (путь после миграции 4.1 — /v3/projects, на v3 заголовок
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:177:    it('nextCursor ведёт на /v3/projects, а не на /v2/queues', async () => {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:178:      httpClient.setResponse('GET', '/v3/projects?perPage=3', createProjectListFixture(3), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:191:      expect(decoded.path).toBe('/v3/projects?perPage=3&page=2');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:196:      httpClient.setResponseQueue('GET', '/v3/projects?perPage=3', [
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:199:      httpClient.setResponseQueue('GET', '/v3/projects?perPage=3&page=2', [
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:207:      expect(paths.every((path) => path.startsWith('/v3/projects'))).toBe(true);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:215:      httpClient.setResponseQueue('GET', '/v3/projects?perPage=100', [
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:218:      httpClient.setResponseQueue('GET', '/v3/projects?perPage=100&page=2', [{ data: page2 }]);
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-projects.operation.test.ts:228:      httpClient.setResponse('GET', '/v3/projects?perPage=100', createProjectListFixture(3), {
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-project.operation.test.ts:51:      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/projects/TESTPROJ');
  packages/servers/yandex-tracker/tests/tracker_api/api_operations/project/get-project.operation.test.ts:61:      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/projects/PROJ?expand=queues');
  packages/servers/yandex-tracker/src/tools/api/entities/create-entity.metadata.ts:13:    '[Entities/Write] Создать Goal/Project/Portfolio (коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  packages/servers/yandex-tracker/src/tools/api/entities/delete-entity.metadata.ts:13:    '[Entities/Write] Удалить Goal/Project/Portfolio (коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  packages/servers/yandex-tracker/src/tools/api/entities/find-entities.metadata.ts:14: * НЕ коллекция `/v3/projects` (см. `get_projects`) — обе лежат на v3, поэтому
  packages/servers/yandex-tracker/src/tools/api/entities/find-entities.metadata.ts:20:    '[Entities/Read] Найти Goal/Project/Portfolio (коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  packages/servers/yandex-tracker/src/tools/api/entities/update-entity.metadata.ts:14:    '(коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  packages/servers/yandex-tracker/src/tools/api/entities/index.ts:5: * `/v3/projects` (см. `#tools/api/projects/index.js`) — разные коллекции,
  packages/servers/yandex-tracker/src/tools/api/entities/get-entity.metadata.ts:13:    '[Entities/Read] Goal/Project/Portfolio по ID (коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  packages/servers/yandex-tracker/src/tools/api/entities/find-entities.schema.ts:23: * (`/v3/entities/project/...`), НЕ legacy `/v3/projects` (см. `get_projects`/
  packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md:280:| Projects | v3 | `/v3/projects` |
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/get-project.operation.ts:10: * API: GET /v3/projects/{projectId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/get-project.operation.ts:54:      const endpoint = `/v3/projects/${projectId}${
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/delete-project.operation.ts:9: * API: DELETE /v3/projects/{projectId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/delete-project.operation.ts:36:    const endpoint = `/v3/projects/${projectId}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/get-projects.operation.ts:10: * API: GET /v3/projects (seekable: Link rel="seek" → total из X-Total-Count)
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/get-projects.operation.ts:65:            'причина — курсор выдан до миграции на /v3/projects (ещё адресует /v2/projects); ' +
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/get-projects.operation.ts:124:    return `/v3/projects${queryString ? `?${queryString}` : ''}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:2: * Починка заголовка `Link` у ответов `/v3/projects`.
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:10: * молча портил данные. На пути `/v3/projects` (миграция 4.1) живая проба не
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:19: * запроса. `page` поддерживают обе версии: на `/v3/projects` проверено
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:23:const PROJECTS_PATH = '/v3/projects';
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:77: * Вернуть заголовки, в которых ссылки `Link` ведут на `/v3/projects` с нашим
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/pin-projects-link.util.ts:80: * @param headers - заголовки ответа `/v3/projects`
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/create-project.operation.ts:9: * API: POST /v3/projects
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/create-project.operation.ts:30:    const endpoint = '/v3/projects';
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/update-project.operation.ts:9: * API: PATCH /v3/projects/{projectId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/project/update-project.operation.ts:40:    const endpoint = `/v3/projects/${projectId}`;
  packages/servers/yandex-tracker/src/tracker_api/api_operations/entity-api/get-entity.operation.ts:10: * ВАЖНО: не путать с legacy-коллекцией `/v3/projects/{id}` (`GetProjectOperation`) —
  packages/servers/yandex-tracker/src/tracker_api/entities/project.entity.ts:4: * Соответствует API v3: /v3/projects/{projectId}
  packages/servers/yandex-tracker/src/tracker_api/entities/project.entity.ts:27: * Обязательные поля (без ?) всегда присутствуют в ответе GET /v3/projects/{projectId}.
  packages/servers/yandex-tracker/src/tracker_api/entities/entity-api.entity.ts:7: * - `Project` (`project.entity.ts`) — LEGACY-коллекция `/v3/projects`, уже
  packages/servers/yandex-tracker/src/tracker_api/entities/entity.factories.ts:379:    self: 'https://api.tracker.yandex.net/v3/projects/1',
  packages/servers/yandex-tracker/src/tracker_api/entities/entity.factories.ts:395:    self: 'https://api.tracker.yandex.net/v3/projects/1',

## literal: /v3/fields
  packages/servers/yandex-tracker/CLAUDE.md:82:| Global fields | v3 | `/v3/fields` |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:162:| глобальные поля | `GET /v3/fields` | `GET /v2/fields` | страница списка полей, 2026-08-23 |
  packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md:169:`update_global_field` — как `PATCH /v3/fields/{id}?version=<version>`, тоже без `version` у нас.
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:9: * Путь — `DELETE /v3/fields/{fieldId}` (миграция 4.1). Официальная документация не
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:11: * ресурса — тот же путь, что и у задокументированных `GET/PATCH /v3/fields/{id}`
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:27:  expectedRequests: [{ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:33:        .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:52:          .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:58:      // Единственный HTTP-вызов delete_global_field — DELETE /v3/fields/{fieldId};
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts:62:          .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:7: * Путь — `GET /v3/fields` (миграция 4.1, `.agentic-planning/plan_tracker_test_coverage/
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:13: * `GET /v3/fields` не пагинируется (комментарий `get-global-fields.schema.ts`,
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:36:  expectedRequests: [{ method: 'get', path: '/v3/fields', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:42:        .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:69:          .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:75:      // Единственный HTTP-вызов get_global_fields — GET /v3/fields; тот же
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:79:          .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:89:  // GET /v3/fields не пагинируется — отдаёт все поля разом (см. схему инструмента).
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:95:        .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-fields.tool.integration.test.ts:107:    ctx.api.expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' }).reply(200, []);
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:7: * Путь — `PATCH /v3/fields/{fieldId}` (миграция 4.1, маршрут ресурса — `inventory/
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:10: * описывает переименование как `PATCH /v3/fields/{id}?version=...`, но
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:28:  expectedRequests: [{ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:36:          path: '/v3/fields/customField123',
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:57:          .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:63:      // Единственный HTTP-вызов update_global_field — PATCH /v3/fields/{fieldId};
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:67:          .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/update-global-field.tool.integration.test.ts:83:        .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:7: * Путь — `POST /v3/fields` (миграция 4.1, маршрут коллекции — `inventory/
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:33:  expectedRequests: [{ method: 'post', path: '/v3/fields', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:45:          path: '/v3/fields',
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:67:          .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:73:      // Единственный HTTP-вызов create_global_field — POST /v3/fields; 404 здесь
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:79:          .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:97:        .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/create-global-field.tool.integration.test.ts:116:        path: '/v3/fields',
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:7: * Путь — `GET /v3/fields/{fieldId}` (миграция 4.1). Документация не описывает получение
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:9: * (`GET /v3/fields/queue` → 200, `inventory/v2-paths-2026-08-24.md`).
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:25:  expectedRequests: [{ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' }],
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:31:        .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:49:          .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:55:      // Единственный HTTP-вызов get_global_field — GET /v3/fields/{fieldId}; 404
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:59:          .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/integration/tools/api/fields/get-global-field.tool.integration.test.ts:75:        .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:244:      request: { method: 'post', url: '/v3/fields', data: { name: 'run-1-field' } },
  packages/servers/yandex-tracker/tests/live_scope/live-scope.guard.test.ts:406:    expect(() => guard?.inspectRequest({ method: 'post', url: '/v3/fields', data: {} })).toThrow(
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:152:      expect(decide('patch', '/v3/fields/f1').allowed).toBe(false);
  packages/servers/yandex-tracker/tests/live_scope/scope-rules.test.ts:248:      const decision = decide('post', '/v3/fields', { name: 'no-prefix-field' });
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:300:    const decision = decide('post', '/v3/fields', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:308:    const decision = decide('post', '/v3/fields', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:315:    const decision = decide('post', '/v3/fields', {
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:323:      decide('post', '/v3/fields', { name: {} }),
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:324:      decide('post', '/v3/fields', { name: { ru: '', en: '' } }),
  packages/servers/yandex-tracker/tests/live_scope/organization-rules.test.ts:325:      decide('post', '/v3/fields', { name: 42 }),
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:158:    ['глобальное поле', 'patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { suggest: true }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:182:    ['глобальное поле', 'patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { queue: 'PROD' }, 'queue'],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:348:    ['глобальное поле', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, { name: 'renamed' }],
  packages/servers/yandex-tracker/tests/live_scope/body-inspection.test.ts:375:    const decision = decide('patch', `/v3/fields/${SANDBOX_GLOBAL_FIELD}`, {
  packages/servers/yandex-tracker/tests/helpers/global-fields.fixture.ts:2: * Фикстуры для Field entity (ГЛОБАЛЬНЫЕ поля трекера, `/v3/fields`).
  packages/servers/yandex-tracker/tests/helpers/global-fields.fixture.ts:12: * /v3/fields` (`api-ref/issues/get-global-fields.md`) также называет поля,
  packages/servers/yandex-tracker/tests/helpers/global-fields.fixture.ts:33:    self: `https://api.tracker.yandex.net/v3/fields/${id}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:284:    path: '/v3/fields',
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:291:    path: `/v3/fields/${SANDBOX_GLOBAL_FIELD}`,
  packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:298:    path: `/v3/fields/${SANDBOX_GLOBAL_FIELD}`,
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:697:            self: 'https://api.tracker.yandex.net/v3/fields/field1',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:717:          self: 'https://api.tracker.yandex.net/v3/fields/customField123',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:736:          self: 'https://api.tracker.yandex.net/v3/fields/newField',
  packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:756:          self: 'https://api.tracker.yandex.net/v3/fields/customField123',
  packages/servers/yandex-tracker/src/tools/api/fields/create-global-field.schema.ts:4: * ВАЖНО: создаёт ГЛОБАЛЬНОЕ кастомное поле (`POST /v3/fields`), видимое во
  packages/servers/yandex-tracker/src/tools/api/fields/get-global-fields.schema.ts:9: * ВАЖНО: эндпоинт `GET /v3/fields` не пагинируется — возвращает разом все
  packages/servers/yandex-tracker/src/tools/api/fields/update-global-field.schema.ts:4: * ВАЖНО: обновляет ГЛОБАЛЬНОЕ поле (`PATCH /v3/fields/{fieldId}`), адресуется
  packages/servers/yandex-tracker/src/tools/api/fields/field-value.schema.ts:4: * ВАЖНО: это глобальные поля (`GET/POST/PATCH/DELETE /v3/fields`) — атрибуты
  packages/servers/yandex-tracker/src/tools/api/fields/delete-global-field.schema.ts:4: * Удаляет ГЛОБАЛЬНОЕ кастомное поле (`DELETE /v3/fields/{fieldId}`) — не
  packages/servers/yandex-tracker/src/tools/api/fields/index.ts:4: * ВАЖНО: это ГЛОБАЛЬНЫЕ поля Трекера (`/v3/fields`), видимые во всей
  packages/servers/yandex-tracker/src/tracker_api/dto/queue-local-field/create-queue-local-field.dto.ts:20:  /** Идентификатор категории поля (см. GET /v3/fields/categories) */
  packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts:230:  // Пакет 7.2.E: глобальные поля Трекера (`/v3/fields`) — Operation/Service/Facade уже
  packages/servers/yandex-tracker/src/tracker_api/dto/field/update-field.dto.ts:4: * API: PATCH /v3/fields/{fieldId}
  packages/servers/yandex-tracker/src/tracker_api/dto/field/create-field.dto.ts:4: * API: POST /v3/fields
  packages/servers/yandex-tracker/src/tracker_api/dto/field/fields-list.output.ts:4: * API: GET /v3/fields
  packages/servers/yandex-tracker/src/tracker_api/dto/field/fields-list.output.ts:12: * ВАЖНО: API /v3/fields возвращает массив полей напрямую,
  packages/servers/yandex-tracker/src/tracker_api/dto/field/field.output.ts:5: * - GetFieldOperation (GET /v3/fields/{fieldId})
  packages/servers/yandex-tracker/src/tracker_api/dto/field/field.output.ts:6: * - CreateFieldOperation (POST /v3/fields)
  packages/servers/yandex-tracker/src/tracker_api/dto/field/field.output.ts:7: * - UpdateFieldOperation (PATCH /v3/fields/{fieldId})
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/create-field.operation.ts:9: * API: POST /v3/fields
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/create-field.operation.ts:47:    const field = await this.httpClient.post<FieldOutput>('/v3/fields', input);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/get-fields.operation.ts:9: * API: GET /v3/fields
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/get-fields.operation.ts:52:    const fields = await this.httpClient.get<FieldsListOutput>('/v3/fields');
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/get-field.operation.ts:9: * API: GET /v3/fields/{fieldId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/get-field.operation.ts:46:    const field = await this.httpClient.get<FieldOutput>(`/v3/fields/${fieldId}`);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/delete-field.operation.ts:9: * API: DELETE /v3/fields/{fieldId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/delete-field.operation.ts:42:    await this.httpClient.delete(`/v3/fields/${fieldId}`);
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/update-field.operation.ts:9: * API: PATCH /v3/fields/{fieldId}
  packages/servers/yandex-tracker/src/tracker_api/api_operations/field/update-field.operation.ts:48:    const field = await this.httpClient.patch<FieldOutput>(`/v3/fields/${fieldId}`, input);
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:5: * - GET /v3/fields - список всех полей трекера
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:6: * - GET /v3/fields/{fieldId} - получение поля по ID
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:7: * - POST /v3/fields - создание кастомного поля
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:8: * - PATCH /v3/fields/{fieldId} - обновление поля
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:9: * - DELETE /v3/fields/{fieldId} - удаление поля
  packages/servers/yandex-tracker/src/tracker_api/entities/field.entity.ts:103:   * @example "https://api.tracker.yandex.net/v3/fields/summary"

