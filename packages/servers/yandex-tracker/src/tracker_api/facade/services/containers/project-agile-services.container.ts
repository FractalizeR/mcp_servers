/**
 * Project & Agile Services Container
 *
 * Группирует сервисы для Agile-сущностей:
 * - BoardService (boards CRUD)
 * - SprintService (sprints CRUD)
 * - BulkChangeService (bulk operations on issues)
 * - BoardColumnService (board columns CRUD)
 *
 * Название сохранено (общий контейнер с Board/Sprint/BulkChange/BoardColumn) — легаси
 * ProjectService (`/v3/projects`) убран отсюда при удалении легаси-семейства проектов,
 * данные проектов доступны через Entity API (`entityType: 'project'`).
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade.
 */

import { injectable, inject } from 'inversify';
import { BoardService } from '../board.service.js';
import { SprintService } from '../sprint.service.js';
import { BulkChangeService } from '../bulk-change.service.js';
import { BoardColumnService } from '../board-column.service.js';

@injectable()
export class ProjectAgileServicesContainer {
  constructor(
    @inject(BoardService) readonly board: BoardService,
    @inject(SprintService) readonly sprint: SprintService,
    @inject(BulkChangeService) readonly bulkChange: BulkChangeService,
    @inject(BoardColumnService) readonly boardColumn: BoardColumnService
  ) {}
}
