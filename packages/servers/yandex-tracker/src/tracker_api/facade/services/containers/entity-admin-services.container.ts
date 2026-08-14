/**
 * Entity/Admin Services Container
 *
 * Группирует сервисы, добавленные пакетом 7.2.A/7.2.B
 * (.agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md):
 * - EntityApiService (Goal/Project/Portfolio + Key Results)
 * - AdministrationService (справочники: типы задач/статусы/резолюции/приоритеты)
 * - FilterService (сохранённые фильтры)
 * - QueueLocalFieldService (локальные поля очереди)
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade
 * (тот же приём, что и в остальных `*ServicesContainer`).
 */

import { injectable, inject } from 'inversify';
import { EntityApiService } from '../entity-api.service.js';
import { AdministrationService } from '../administration.service.js';
import { FilterService } from '../filter.service.js';
import { QueueLocalFieldService } from '../queue-local-field.service.js';

@injectable()
export class EntityAdminServicesContainer {
  constructor(
    @inject(EntityApiService) readonly entityApi: EntityApiService,
    @inject(AdministrationService) readonly administration: AdministrationService,
    @inject(FilterService) readonly filter: FilterService,
    @inject(QueueLocalFieldService) readonly queueLocalField: QueueLocalFieldService
  ) {}
}
