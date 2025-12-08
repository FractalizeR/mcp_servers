/**
 * Project & Agile Services Container
 *
 * Группирует сервисы для работы с проектами и Agile:
 * - ProjectService (projects CRUD)
 * - BoardService (boards CRUD)
 * - SprintService (sprints CRUD)
 * - BulkChangeService (bulk operations on issues)
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade.
 */

import { injectable, inject } from 'inversify';
import { ProjectService } from '../project.service.js';
import { BoardService } from '../board.service.js';
import { SprintService } from '../sprint.service.js';
import { BulkChangeService } from '../bulk-change.service.js';

@injectable()
export class ProjectAgileServicesContainer {
  constructor(
    @inject(ProjectService) readonly project: ProjectService,
    @inject(BoardService) readonly board: BoardService,
    @inject(SprintService) readonly sprint: SprintService,
    @inject(BulkChangeService) readonly bulkChange: BulkChangeService
  ) {}
}
